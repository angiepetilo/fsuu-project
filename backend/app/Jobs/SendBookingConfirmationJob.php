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
            $this->booking->loadMissing(['items', 'trackingNumber', 'office']);
        }

        try {
            Mail::to($email)->send(new BookingConfirmationMail($this->type, $this->booking));
        } catch (\Throwable $e) {
            Log::warning("SendBookingConfirmationJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->to($email)->send(new BookingConfirmationMail($this->type, $this->booking));
            } catch (\Throwable $err) {
                Log::error("SendBookingConfirmationJob failed on both mailers: " . $err->getMessage());
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
