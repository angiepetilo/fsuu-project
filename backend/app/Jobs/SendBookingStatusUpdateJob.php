<?php

namespace App\Jobs;

use App\Mail\BookingStatusUpdateMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendBookingStatusUpdateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries    = 3;
    public array $backoff = [30, 60, 120];
    public int $timeout  = 30;

    /**
     * @param string      $type    'venue' | 'equipment'
     * @param mixed       $booking AvrVenueBooking | EquipmentBorrowing model
     * @param string      $status  'approved' | 'rejected' | 'cancelled'
     * @param string|null $remarks Optional staff remarks
     */
    public function __construct(
        public readonly string  $type,
        public readonly mixed   $booking,
        public readonly string  $status,
        public readonly ?string $remarks = null
    ) {}

    public function handle(): void
    {
        $email = $this->booking->requestor_email
            ?? $this->booking->email_address
            ?? $this->booking->borrower_email
            ?? $this->booking->email
            ?? null;

        if (! $email) {
            Log::warning('SendBookingStatusUpdateJob: no email address found on booking record', [
                'type' => $this->type,
                'id'   => $this->booking->id ?? null,
            ]);
            return;
        }

        // Dynamically apply database-configured SMTP settings
        \App\Models\SystemSetting::configureMailer();

        $refCode = $this->booking->reference_code 
            ?? $this->booking->trackingNumber?->reference_code 
            ?? ($this->type === 'venue' ? "TRK-AVR-{$this->booking->id}" : "EQ-{$this->booking->id}");
        $recipientName = $this->booking->filer_name ?? $this->booking->requestor_name ?? 'FSUU Filer';
        $statusUpper = strtoupper($this->status);
        $subject = "Booking Status Update: {$statusUpper} — {$refCode}";

        $mailSent = false;
        $mailError = null;

        try {
            Mail::to($email)->send(
                new BookingStatusUpdateMail($this->type, $this->booking, $this->status, $this->remarks)
            );
            $mailSent = true;
        } catch (\Throwable $e) {
            Log::warning("SendBookingStatusUpdateJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->to($email)->send(
                    new BookingStatusUpdateMail($this->type, $this->booking, $this->status, $this->remarks)
                );
                $mailSent = true;
            } catch (\Throwable $err) {
                $mailError = $err->getMessage();
                Log::error("SendBookingStatusUpdateJob failed on both mailers: " . $err->getMessage());
            }
        }

        // Record in communication logs
        \App\Models\CommunicationLog::record([
            'channel'         => 'email',
            'category'        => 'status_update',
            'recipient_name'  => $recipientName,
            'recipient_email' => $email,
            'recipient_phone' => $this->booking->contact_number ?? $this->booking->phone_number ?? null,
            'reference_code'  => $refCode,
            'subject'         => $subject,
            'message_preview' => "Status updated to {$statusUpper} for {$refCode}. Remarks: " . ($this->remarks ?: 'None'),
            'status'          => $mailSent ? 'sent' : 'failed',
            'error_message'   => $mailError,
        ]);

        // Send SMS status update notification
        try {
            \App\Services\SmsService::sendStatusNotification($this->type, $this->booking, $this->status, $this->remarks);
        } catch (\Throwable $smsErr) {
            Log::warning("SendBookingStatusUpdateJob SMS dispatch failed: " . $smsErr->getMessage());
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendBookingStatusUpdateJob permanently failed', [
            'type'   => $this->type,
            'id'     => $this->booking->id ?? null,
            'status' => $this->status,
            'error'  => $e->getMessage(),
        ]);
    }
}
