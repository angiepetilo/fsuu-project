<?php

namespace App\Jobs;

use App\Mail\AdminPendingTaskMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAdminPendingTaskNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 30;

    /**
     * @param string $taskType 'new_venue_booking' | 'new_equipment_borrowing' | 'requirements_resubmitted' | 'incomplete_notice'
     * @param mixed  $record
     * @param string|null $customDetails
     */
    public function __construct(
        public readonly string $taskType,
        public readonly mixed  $record,
        public readonly ?string $customDetails = null
    ) {}

    public function handle(): void
    {
        // Dynamically apply database-configured SMTP settings
        \App\Models\SystemSetting::configureMailer();

        // Query active super admins and staff with valid emails
        $recipients = User::query()
            ->whereIn('role', ['super_admin', 'staff'])
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->pluck('email')
            ->unique()
            ->values()
            ->all();

        if (empty($recipients)) {
            Log::info("SendAdminPendingTaskNotificationJob: No staff or super_admin email recipients found.");
            return;
        }

        $refCode = $this->record->reference_code
            ?? ($this->record->trackingNumber?->reference_code)
            ?? ($this->taskType === 'new_venue_booking' ? "TRK-AVR-{$this->record->id}" : "EQ-{$this->record->id}");

        $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $actionUrl = match($this->taskType) {
            'new_venue_booking', 'requirements_resubmitted' => $baseUrl . "/general/venue-bookings?search=" . urlencode($refCode),
            'new_equipment_borrowing' => $baseUrl . "/general/equipment-borrowings?search=" . urlencode($refCode),
            default => $baseUrl . "/general/venue-bookings",
        };

        $details = $this->customDetails;
        if (!$details) {
            $details = match($this->taskType) {
                'new_venue_booking' => "New venue reservation submitted for {$this->record->venue?->name} by {$this->record->filer_name}.",
                'new_equipment_borrowing' => "New equipment borrowing requisition submitted by {$this->record->requestor_name}.",
                'requirements_resubmitted' => "Applicant has uploaded the missing requirements for {$refCode}.",
                default => "Requisition requires administrative review.",
            };
        }

        foreach ($recipients as $recipientEmail) {
            try {
                Mail::to($recipientEmail)->send(
                    new AdminPendingTaskMail($this->taskType, $this->record, $refCode, $details, $actionUrl)
                );
            } catch (\Throwable $e) {
                Log::warning("SendAdminPendingTaskNotificationJob failed for {$recipientEmail}: {$e->getMessage()}. Retrying via smtp mailer...");
                try {
                    Mail::mailer('smtp')->to($recipientEmail)->send(
                        new AdminPendingTaskMail($this->taskType, $this->record, $refCode, $details, $actionUrl)
                    );
                } catch (\Throwable $err) {
                    Log::error("SendAdminPendingTaskNotificationJob failed via smtp for {$recipientEmail}: " . $err->getMessage());
                }
            }
        }
    }
}
