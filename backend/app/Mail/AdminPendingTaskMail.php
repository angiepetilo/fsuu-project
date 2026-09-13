<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminPendingTaskMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $taskType, // 'new_venue_booking', 'new_equipment_borrowing', 'requirements_resubmitted', 'incomplete_notice'
        public readonly mixed  $record,
        public readonly string $referenceCode,
        public readonly string $details,
        public readonly ?string $actionUrl = null
    ) {}

    public function envelope(): Envelope
    {
        $subjectPrefix = match($this->taskType) {
            'new_venue_booking'        => 'New Pending Venue Reservation',
            'new_equipment_borrowing'  => 'New Pending Equipment Borrowing',
            'requirements_resubmitted' => 'Requirements Resubmitted for Review',
            'incomplete_notice'        => 'Booking Marked Incomplete',
            default                    => 'Action Required: Pending Task',
        };

        return new Envelope(
            subject: "[{$this->referenceCode}] FSUU AVR Task — {$subjectPrefix}"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin_pending_task',
            with: [
                'taskType'      => $this->taskType,
                'record'        => $this->record,
                'referenceCode' => $this->referenceCode,
                'details'       => $this->details,
                'actionUrl'     => $this->actionUrl,
            ]
        );
    }
}
