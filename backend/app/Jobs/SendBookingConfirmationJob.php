<?php

namespace App\Jobs;

use App\Mail\BookingConfirmationMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendBookingConfirmationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public array $backoff = [30, 60, 120];
    public int $timeout = 30;

    /**
     * @param string $type    'venue' | 'equipment'
     * @param mixed  $booking AvrVenueBooking | EquipmentBorrowing model
     */
    public function __construct(
        public readonly string $type,
        public readonly mixed  $booking
    ) {}

    public function handle(): void
    {
        $email = $this->booking->requestor_email
            ?? $this->booking->email_address
            ?? $this->booking->borrower_email
            ?? $this->booking->email
            ?? null;

        if (! $email) {
            Log::warning('SendBookingConfirmationJob: no email address found on booking record', [
                'type' => $this->type,
                'id'   => $this->booking->id ?? null,
            ]);
            return;
        }

        // Load relationships needed by the blade template
        if ($this->type === 'venue') {
            $this->booking->loadMissing(['venue', 'trackingNumber', 'documents']);
        } else {
            $this->booking->loadMissing(['items', 'trackingNumber']);
        }

        // Dynamically apply database-configured SMTP settings
        \App\Models\SystemSetting::configureMailer();

        $refCode = $this->booking->reference_code 
            ?? $this->booking->trackingNumber?->reference_code 
            ?? ($this->type === 'venue' ? "TRK-AVR-{$this->booking->id}" : "EQ-{$this->booking->id}");
        $recipientName = $this->booking->filer_name ?? $this->booking->requestor_name ?? 'FSUU Filer';
        $category = $this->type === 'venue' ? 'venue_confirmation' : 'equipment_confirmation';
        $subject = $this->type === 'venue' 
            ? "Venue Reservation Confirmation — {$refCode}" 
            : "Equipment Borrowing Confirmation — {$refCode}";

        $mailSent = false;
        $mailError = null;

        try {
            Mail::to($email)->send(new BookingConfirmationMail($this->type, $this->booking));
            $mailSent = true;
        } catch (\Throwable $e) {
            Log::warning("SendBookingConfirmationJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->to($email)->send(new BookingConfirmationMail($this->type, $this->booking));
                $mailSent = true;
            } catch (\Throwable $err) {
                $mailError = $err->getMessage();
                Log::error("SendBookingConfirmationJob failed on both mailers: " . $err->getMessage());
            }
        }

        // Record in communication logs
        \App\Models\CommunicationLog::record([
            'channel'         => 'email',
            'category'        => $category,
            'recipient_name'  => $recipientName,
            'recipient_email' => $email,
            'recipient_phone' => $this->booking->contact_number ?? $this->booking->phone_number ?? null,
            'reference_code'  => $refCode,
            'subject'         => $subject,
            'message_preview' => "Booking confirmation dispatch for {$refCode} to {$email}",
            'status'          => $mailSent ? 'sent' : 'failed',
            'error_message'   => $mailError,
        ]);

        // Send SMS confirmation for equipment borrowing requests
        if ($this->type === 'equipment') {
            try {
                \App\Services\SmsService::sendBorrowingConfirmation($this->booking);
            } catch (\Throwable $smsErr) {
                Log::warning("SendBookingConfirmationJob SMS dispatch failed: " . $smsErr->getMessage());
            }
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendBookingConfirmationJob permanently failed', [
            'type'  => $this->type,
            'id'    => $this->booking->id ?? null,
            'error' => $e->getMessage(),
        ]);
    }
}
