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
    public readonly string $formattedSchedule;

    public function __construct(
        public readonly string $type,
        public readonly mixed $booking
    ) {
        $this->refCode = $this->booking->reference_code
            ?? ($this->booking->trackingNumber?->reference_code)
            ?? ($this->booking->id ? ($this->type === 'venue' ? "TRK-AVR{$this->booking->id}" : "EQ-2026-{$this->booking->id}") : 'TRK-FSUU');

        $this->formattedSchedule = self::formatSchedule($this->booking);
        $this->formattedStart = $this->formattedSchedule;
        $this->formattedEnd = $this->formattedSchedule;
    }

    public static function formatSchedule(mixed $booking): string
    {
        try {
            $rawStartDate = $booking->date_of_usage 
                ?? $booking->start_datetime 
                ?? $booking->date 
                ?? null;

            if ($rawStartDate && is_string($rawStartDate) && str_contains($rawStartDate, 'T')) {
                $rawStartDate = explode('T', $rawStartDate)[0];
            }

            $startDateObj = $rawStartDate ? Carbon::parse($rawStartDate) : null;
            $startDateStr = $startDateObj ? $startDateObj->format('m/d/Y') : null;

            $rawEndDate = $booking->reservation_end_date 
                ?? $booking->end_date 
                ?? $booking->end_datetime 
                ?? $rawStartDate;

            if ($rawEndDate && is_string($rawEndDate) && str_contains($rawEndDate, 'T')) {
                $rawEndDate = explode('T', $rawEndDate)[0];
            }

            $endDateObj = $rawEndDate ? Carbon::parse($rawEndDate) : $startDateObj;
            $endDateStr = $endDateObj ? $endDateObj->format('m/d/Y') : $startDateStr;

            $rawStartTime = $booking->time_start ?? ($booking->start_datetime ? substr($booking->start_datetime, 11, 8) : '08:00:00');
            $startTimeStr = Carbon::parse("2000-01-01 {$rawStartTime}")->format('h:i A');

            $rawEndTime = $booking->time_end ?? ($booking->end_datetime ? substr($booking->end_datetime, 11, 8) : '17:00:00');
            $endTimeStr = Carbon::parse("2000-01-01 {$rawEndTime}")->format('h:i A');

            if (!$startDateStr) {
                return "{$startTimeStr} TO {$endTimeStr}";
            }

            // Single day / Same date -> MM/DD/YYYY | START TIME TO END TIME
            if (!$endDateStr || $startDateStr === $endDateStr) {
                return "{$startDateStr} | {$startTimeStr} TO {$endTimeStr}";
            }

            // Multi day -> MM/DD/YYYY TO MM/DD/YYYY | START TIME TO END TIME
            return "{$startDateStr} TO {$endDateStr} | {$startTimeStr} TO {$endTimeStr}";
        } catch (\Throwable $e) {
            return "Scheduled Time";
        }
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
                'formattedSchedule' => $this->formattedSchedule,
            ]
        );
    }
}

