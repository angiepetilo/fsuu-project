<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class BookingConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $refCode;
    public readonly string $formattedStart;
    public readonly string $formattedEnd;

    public function __construct(
        public readonly string $type,
        public readonly mixed $booking
    ) {
        $this->refCode = $this->booking->reference_code
            ?? ($this->booking->trackingNumber?->reference_code)
            ?? ($this->booking->id ? ($this->type === 'venue' ? "TRK-AVR{$this->booking->id}" : "EQ-2026-{$this->booking->id}") : 'TRK-FSUU');

        $rawStart = $this->booking->start_datetime 
            ?? ($this->booking->date_of_usage ? ($this->booking->date_of_usage . ' ' . ($this->booking->time_start ?? '08:00')) : null);
        $this->formattedStart = $rawStart ? Carbon::parse($rawStart)->format('M d, Y h:i A') : 'N/A';

        $rawEnd = $this->booking->end_datetime 
            ?? ($this->booking->date_of_usage ? (($this->booking->reservation_end_date ?? $this->booking->date_of_usage) . ' ' . ($this->booking->time_end ?? '17:00')) : null);
        $this->formattedEnd = $rawEnd ? Carbon::parse($rawEnd)->format('M d, Y h:i A') : 'N/A';
    }

    public function envelope(): Envelope
    {
        $label = $this->type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing';
        return new Envelope(
            subject: "[{$this->refCode}] FSUU {$label} — Received & Pending Review"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking_confirmation',
            with: [
                'refCode' => $this->refCode,
                'formattedStart' => $this->formattedStart,
                'formattedEnd' => $this->formattedEnd,
            ]
        );
    }
}

