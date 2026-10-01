<?php

namespace App\Console\Commands;

use App\Models\CommunicationLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DiagnoseEmailQueueCommand extends Command
{
    protected $signature = 'diagnose:email-queue';
    protected $description = 'Diagnose email queue and check why booking confirmations are not being sent';

    public function handle()
    {
        $this->info('=== EMAIL QUEUE DIAGNOSTIC REPORT ===');
        $this->newLine();

        // 1. Check Queue Configuration
        $this->info('1. QUEUE CONFIGURATION');
        $queueConnection = config('queue.default');
        $this->line("   Queue Connection: {$queueConnection}");
        
        if ($queueConnection === 'sync') {
            $this->error('   ⚠️  WARNING: Queue is set to "sync" - jobs run immediately, not in background!');
        } else {
            $this->info('   ✓ Queue is asynchronous');
        }
        $this->newLine();

        // 2. Check Pending Jobs
        $this->info('2. PENDING JOBS IN QUEUE');
        $pendingJobs = DB::table('jobs')->count();
        $this->line("   Pending jobs: {$pendingJobs}");
        
        if ($pendingJobs > 0) {
            $this->warn("   ⚠️  {$pendingJobs} jobs waiting to be processed");
            $oldestJob = DB::table('jobs')->orderBy('created_at', 'asc')->first();
            if ($oldestJob) {
                $this->line("   Oldest job created: {$oldestJob->created_at}");
            }
        } else {
            $this->info('   ✓ No jobs pending (queue is clear)');
        }
        $this->newLine();

        // 3. Check Failed Jobs
        $this->info('3. FAILED JOBS');
        $failedJobs = DB::table('failed_jobs')->count();
        $this->line("   Failed jobs: {$failedJobs}");
        
        if ($failedJobs > 0) {
            $this->error("   ⚠️  {$failedJobs} jobs have failed");
            $recentFailed = DB::table('failed_jobs')
                ->orderBy('failed_at', 'desc')
                ->limit(3)
                ->get();
            
            foreach ($recentFailed as $job) {
                $payload = json_decode($job->payload, true);
                $jobClass = $payload['displayName'] ?? 'Unknown';
                $this->line("   - {$jobClass} failed at {$job->failed_at}");
                $exception = substr($job->exception, 0, 200);
                $this->line("     Error: {$exception}...");
            }
        } else {
            $this->info('   ✓ No failed jobs');
        }
        $this->newLine();

        // 4. Check Recent Booking Confirmation Emails
        $this->info('4. RECENT BOOKING CONFIRMATION EMAILS (Last 10)');
        $bookingEmails = CommunicationLog::where(function($q) {
                $q->where('subject', 'like', '%Booking Confirmation%')
                  ->orWhere('reference_code', 'like', 'VB-%')
                  ->orWhere('reference_code', 'like', 'EB-%');
            })
            ->latest()
            ->limit(10)
            ->get(['channel', 'recipient_email', 'reference_code', 'subject', 'status', 'error_message', 'created_at']);

        if ($bookingEmails->isEmpty()) {
            $this->warn('   ⚠️  No booking confirmation emails found in communication_logs');
            $this->line('   This means SendBookingConfirmationJob is NOT being dispatched');
        } else {
            foreach ($bookingEmails as $email) {
                $status = $email->status === 'sent' ? '✓' : '✗';
                $this->line("   {$status} {$email->reference_code} → {$email->recipient_email} ({$email->status})");
                if ($email->status === 'failed' && $email->error_message) {
                    $this->line("     Error: {$email->error_message}");
                }
                $this->line("     Sent: {$email->created_at}");
            }
        }
        $this->newLine();

        // 5. Check All Recent Emails
        $this->info('5. ALL RECENT EMAILS (Last 10)');
        $allEmails = CommunicationLog::where('channel', 'email')
            ->latest()
            ->limit(10)
            ->get(['recipient_email', 'reference_code', 'subject', 'status', 'created_at']);

        if ($allEmails->isEmpty()) {
            $this->warn('   ⚠️  No emails found at all in communication_logs');
        } else {
            foreach ($allEmails as $email) {
                $status = $email->status === 'sent' ? '✓' : '✗';
                $subject = substr($email->subject ?? 'No subject', 0, 40);
                $this->line("   {$status} {$subject} → {$email->recipient_email} ({$email->status})");
            }
        }
        $this->newLine();

        // 6. Check Mail Configuration
        $this->info('6. MAIL CONFIGURATION');
        $this->line('   Mailer: ' . config('mail.default'));
        $this->line('   Host: ' . config('mail.mailers.smtp.host'));
        $this->line('   Port: ' . config('mail.mailers.smtp.port'));
        $this->line('   From: ' . config('mail.from.address'));
        $this->newLine();

        // 7. Test Queue Job Dispatch
        $this->info('7. QUEUE WORKER STATUS TEST');
        $this->line('   To test if queue worker is processing jobs, run:');
        $this->line('   php artisan queue:work --once');
        $this->newLine();

        // Summary
        $this->info('=== DIAGNOSIS COMPLETE ===');
        
        if ($pendingJobs > 100) {
            $this->error('⚠️  ACTION REQUIRED: Too many pending jobs - queue worker may be down');
        } elseif ($failedJobs > 10) {
            $this->error('⚠️  ACTION REQUIRED: Many jobs failing - check error messages above');
        } elseif ($bookingEmails->isEmpty()) {
            $this->error('⚠️  ACTION REQUIRED: Booking confirmation emails not being dispatched');
            $this->line('   Check booking creation logic in VenueBookingService and EquipmentBorrowingService');
        } else {
            $failedCount = $bookingEmails->where('status', 'failed')->count();
            $sentCount = $bookingEmails->where('status', 'sent')->count();
            
            if ($failedCount > $sentCount) {
                $this->error('⚠️  Most booking emails are failing - check SMTP credentials');
            } else {
                $this->info('✓ Email system appears to be working correctly');
            }
        }

        return 0;
    }
}
