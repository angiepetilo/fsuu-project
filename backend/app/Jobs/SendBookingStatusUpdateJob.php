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

        try {
            Mail::to($email)->send(
                new BookingStatusUpdateMail($this->type, $this->booking, $this->status, $this->remarks)
            );
        } catch (\Throwable $e) {
            Log::warning("SendBookingStatusUpdateJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->to($email)->send(
                    new BookingStatusUpdateMail($this->type, $this->booking, $this->status, $this->remarks)
                );
            } catch (\Throwable $err) {
                Log::error("SendBookingStatusUpdateJob failed on both mailers: " . $err->getMessage());
            }
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
