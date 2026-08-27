<?php

namespace App\Jobs;

use App\Mail\NewUserCredentialsMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNewUserCredentialsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 60, 120];
    public int $timeout = 30;

    public function __construct(
        public readonly mixed $user,
        public readonly string $password
    ) {}

    public function handle(): void
    {
        $recipient = $this->user->email_address ?: $this->user->email;
        if (empty($recipient)) {
            Log::warning('[MAIL] SendNewUserCredentialsJob: No recipient email provided.');
            return;
        }

        // Dynamically apply database-configured SMTP settings
        \App\Models\SystemSetting::configureMailer();

        $recipientName = $this->user->name ?? 'System User';
        $subject = 'Your Official FSUU Facilities & Equipment Booking Account Credentials';
        $mailSent = false;
        $mailError = null;

        try {
            Log::info("[MAIL] Sending credentials email to: {$recipient}");
            Mail::to($recipient)->send(new NewUserCredentialsMail($this->user, $this->password));
            Log::info("[MAIL] SUCCESS: Credentials email delivered to: {$recipient}");
            $mailSent = true;
        } catch (\Throwable $e) {
            Log::warning("[MAIL] Default mailer failed for {$recipient} ({$e->getMessage()}). Retrying via Gmail SMTP...");
            try {
                // Immediate failover to Gmail SMTP transport
                Mail::mailer('smtp')->to($recipient)->send(new NewUserCredentialsMail($this->user, $this->password));
                Log::info("[MAIL] SUCCESS: Credentials email delivered via SMTP fallback to: {$recipient}");
                $mailSent = true;
            } catch (\Throwable $smtpErr) {
                $mailError = $smtpErr->getMessage();
                Log::error("[MAIL] FAILED: Both default and SMTP mailers failed for {$recipient}: " . $smtpErr->getMessage());
            }
        }

        // Record in communication logs
        \App\Models\CommunicationLog::record([
            'channel'         => 'email',
            'category'        => 'user_credentials',
            'recipient_name'  => $recipientName,
            'recipient_email' => $recipient,
            'recipient_phone' => $this->user->phone ?? $this->user->contact_number ?? null,
            'reference_code'  => "USER-{$this->user->id}",
            'subject'         => $subject,
            'message_preview' => "Account credentials generated for {$recipientName} ({$recipient})",
            'status'          => $mailSent ? 'sent' : 'failed',
            'error_message'   => $mailError,
        ]);
    }

    /**
     * Called after all retries are exhausted.
     */
    public function failed(\Throwable $e): void
    {
        Log::error('[MAIL] SendNewUserCredentialsJob permanently failed', [
            'user_id'   => $this->user->id ?? null,
            'recipient' => $this->user->email_address ?: $this->user->email ?: null,
            'error'     => $e->getMessage(),
        ]);
    }
}
