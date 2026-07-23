<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingStatusUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param string $type     'venue' | 'equipment'
     * @param object $booking  The booking/borrowing model
     * @param string $status   'approved' | 'rejected' | 'cancelled'
     * @param string|null $remarks
     */
    public function __construct(
        public readonly string $type,
        public readonly mixed  $booking,
        public readonly string $status,
        public readonly ?string $remarks = null
    ) {}

    public function envelope(): Envelope
    {
        $label = $this->type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing';
        $statusLabel = ucfirst($this->status);
        return new Envelope(
            subject: "[{$this->booking->reference_code}] FSUU {$label} — {$statusLabel}"
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.booking_status_update');
    }
}
