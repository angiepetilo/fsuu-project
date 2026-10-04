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
    public readonly string $formattedSchedule;

    public function __construct(
        public readonly string $type,
        public readonly mixed  $booking,
        public readonly string $status,
        public readonly ?string $remarks = null
    ) {
        $this->refCode = $this->booking->reference_code
            ?? ($this->booking->trackingNumber?->reference_code)
            ?? ($this->booking->id ? ($this->type === 'venue' ? "TRK-AVR{$this->booking->id}" : "EQ-2026-{$this->booking->id}") : 'TRK-FSUU');

        $this->formattedSchedule = BookingConfirmationMail::formatSchedule($this->booking);
        $this->formattedStart = $this->formattedSchedule;
        $this->formattedEnd = $this->formattedSchedule;
    }

    public function envelope(): Envelope
    {
        $label = $this->type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing';
        $normalized = strtolower(str_replace(['_', '-'], ' ', (string)$this->status));

        $classification = strtolower(trim((string)($this->booking->requestor_identity_type ?? $this->booking->classification ?? 'student')));
        $isExternal = str_contains($classification, 'external');
        $extTag = $isExternal ? ' [External Client]' : '';

        $subject = match (true) {
            in_array($normalized, ['approved']) => $this->type === 'venue'
                ? "CONFIRMED: Venue Reservation [{$this->refCode}]{$extTag}"
                : "READY FOR PICKUP: Equipment Borrowing Approved [{$this->refCode}]{$extTag}",
            in_array($normalized, ['on going', 'on-going', 'ongoing', 'released', 'on_going']) => $this->type === 'venue'
                ? "CHECK-IN LOGGED: Event Now In Progress [{$this->refCode}]{$extTag}"
                : "CUSTODY HANDOVER RECEIPT: Equipment Units Released [{$this->refCode}]{$extTag}",
            in_array($normalized, ['overdue', 'passed due', 'return past due notice']) =>
                "OVERDUE NOTICE: Equipment Return Required Immediately [{$this->refCode}]{$extTag}",
            in_array($normalized, ['exceed end time', 'exceeded end time', 'overtime']) =>
                "URGENT: Reservation Exceeded Scheduled End Time [{$this->refCode}]{$extTag}",
            in_array($normalized, ['late return', 'late']) =>
                "NOTICE OF LATE RETURN [{$this->refCode}]{$extTag}",
            in_array($normalized, ['completed', 'returned', 'done', 'cleared']) => $this->type === 'venue'
                ? "CLEARED: Facility Turnover Completed [{$this->refCode}]{$extTag}"
                : "CLEARANCE RECEIPT: Equipment Returned & Inspected [{$this->refCode}]{$extTag}",
            in_array($normalized, ['reminder', 'due soon', 'due_soon', 'return reminder', 'return_reminder']) => $this->type === 'venue'
                ? "REMINDER: Your reservation is scheduled for today [{$this->refCode}]{$extTag}"
                : "DUE SOON: Equipment Return Deadline Approaching [{$this->refCode}]{$extTag}",
            in_array($normalized, ['incomplete', 'missing requirements']) =>
                "ACTION REQUIRED: Missing Requirements for [{$this->refCode}]{$extTag}",
            in_array($normalized, ['cancelled', 'auto cancelled', 'auto-cancelled', 'auto_cancelled']) =>
                "NOTICE: Reservation Cancelled [{$this->refCode}]{$extTag}",
            in_array($normalized, ['rejected']) =>
                "NOTICE: Reservation Not Approved [{$this->refCode}]{$extTag}",
            default => "[{$this->refCode}] FSUU {$label} — " . ucfirst($this->status) . $extTag,
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking_status_update',
            with: [
                'type'             => $this->type,
                'booking'          => $this->booking,
                'status'           => $this->status,
                'remarks'          => $this->remarks,
                'refCode'          => $this->refCode,
                'formattedStart'   => $this->formattedStart,
                'formattedEnd'     => $this->formattedEnd,
                'formattedSchedule'=> $this->formattedSchedule,
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
