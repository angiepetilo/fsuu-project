<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $details,
        public string $type = 'venue'
    ) {}

    public function envelope(): Envelope
    {
        $subjectType = $this->type === 'venue' ? 'Venue Booking' : 'Equipment Borrowing';
        
        return new Envelope(
            subject: "{$subjectType} Request Submitted - {$this->details['tracking_number']}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking_submitted',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
