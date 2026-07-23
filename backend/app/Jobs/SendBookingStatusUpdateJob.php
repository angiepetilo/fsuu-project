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
        $email = $this->booking->requestor_email ?? null;

        if (! $email) {
            Log::warning('SendBookingStatusUpdateJob: no requestor_email', [
                'type' => $this->type,
                'id'   => $this->booking->id ?? null,
            ]);
            return;
        }

        Mail::to($email)->send(
            new BookingStatusUpdateMail($this->type, $this->booking, $this->status, $this->remarks)
        );
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
