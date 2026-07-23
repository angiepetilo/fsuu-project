<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param string $type     'venue' | 'equipment'
     * @param object $booking  The booking/borrowing model
     */
    public function __construct(
        public readonly string $type,
        public readonly mixed $booking
    ) {}

    public function envelope(): Envelope
    {
        $label = $this->type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing';
        return new Envelope(
            subject: "[{$this->booking->reference_code}] FSUU {$label} — Received & Pending Review"
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.booking_confirmation');
    }
}
