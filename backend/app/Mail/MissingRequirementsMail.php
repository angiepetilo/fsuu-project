<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MissingRequirementsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $bookingDetails;
    public $type; // 'venue' or 'equipment'

    /**
     * Create a new message instance.
     */
    public function __construct($bookingDetails, $type = 'venue')
    {
        $this->bookingDetails = $bookingDetails;
        $this->type = $type;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Action Required: Missing Requirements for your ' . ucfirst($this->type) . ' Booking',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.missing_requirements',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
