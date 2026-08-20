<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class BookingStatusUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $refCode;
    public readonly string $formattedStart;
    public readonly string $formattedEnd;

    public function __construct(
        public readonly string $type,
        public readonly mixed  $booking,
        public readonly string $status,
        public readonly ?string $remarks = null
    ) {
        $this->refCode = $this->booking->reference_code
            ?? ($this->booking->trackingNumber?->reference_code)
            ?? ($this->booking->id ? ($this->type === 'venue' ? "TRK-AVR{$this->booking->id}" : "EQ-2026-{$this->booking->id}") : 'TRK-FSUU');

        $this->formattedStart = $this->parseDateTimeSafely(
            $this->booking->start_datetime ?? null,
            $this->booking->date_of_usage ?? null,
            $this->booking->time_start ?? null,
            '08:00:00'
        );

        $this->formattedEnd = $this->parseDateTimeSafely(
            $this->booking->end_datetime ?? null,
            $this->booking->reservation_end_date ?? $this->booking->date_of_usage ?? null,
            $this->booking->time_end ?? null,
            '17:00:00'
        );
    }

    public function envelope(): Envelope
    {
        $label = $this->type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing';
        $statusLabel = ucfirst($this->status);
        return new Envelope(
            subject: "[{$this->refCode}] FSUU {$label} — {$statusLabel}"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking_status_update',
            with: [
                'refCode' => $this->refCode,
                'formattedStart' => $this->formattedStart,
                'formattedEnd' => $this->formattedEnd,
            ]
        );
    }

    private function parseDateTimeSafely(?string $startOrEnd, mixed $dateOfUsage, ?string $timeStr, string $defaultTime): string
    {
        try {
            if ($startOrEnd && strlen(trim($startOrEnd)) > 0) {
                return Carbon::parse($startOrEnd)->format('M d, Y h:i A');
            }

            if ($dateOfUsage) {
                $dateOnly = substr(trim((string)$dateOfUsage), 0, 10);
                $timeOnly = $timeStr ? trim($timeStr) : $defaultTime;
                return Carbon::parse("{$dateOnly} {$timeOnly}")->format('M d, Y h:i A');
            }
        } catch (\Throwable $e) {
            // Fallback for safety
        }

        return 'N/A';
    }
}
