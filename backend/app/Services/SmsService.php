<?php

namespace App\Services;

use App\Models\EquipmentBorrow;
use App\Mail\BookingStatusUpdateMail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SmsService
{
    public static bool $smsEnabled = true;

    /**
     * Send an SMS via iPROG SMS API.
     *
     * @param string $phoneNumber e.g. "09639556586", "+639639556586"
     * @param string $message
     * @return array|null
     */
    public static function send(string $phoneNumber, string $message): ?array
    {
        if (!self::$smsEnabled) {
            Log::info("SmsService: SMS dispatch is currently disabled (using email notifications).");
            return null;
        }

        $settings = \App\Models\SystemSetting::getSettings();
        $apiKey = $settings->sms_api_key ?: (config('services.iprogsms.api_key') ?: env('IPROG_SMS_API_KEY') ?: env('SMS_API_KEY'));

        if (empty($apiKey)) {
            Log::warning("SmsService: SMS API key is not configured in system settings or environment.");
            return null;
        }

        // Clean and normalize Philippine phone number format
        $cleanNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
        if (str_starts_with($cleanNumber, '63')) {
            $cleanNumber = '0' . substr($cleanNumber, 2);
        }

        // Ensure 11 digits format (e.g. 09XXXXXXXXX)
        if (strlen($cleanNumber) === 10 && str_starts_with($cleanNumber, '9')) {
            $cleanNumber = '0' . $cleanNumber;
        }

        if (strlen($cleanNumber) !== 11 || !str_starts_with($cleanNumber, '09')) {
            Log::warning("SmsService: Invalid Philippine mobile number: {$phoneNumber}");
            return null;
        }

        try {
            $apiUrl = $settings->sms_api_url ?: (
                str_starts_with($apiKey, 'sk_')
                    ? 'https://unismsapi.com/api/sms'
                    : (config('services.iprogsms.api_url') ?: env('IPROG_SMS_API_URL') ?: env('SMS_API_URL', 'https://unismsapi.com/api/sms'))
            );
            $senderName = config('services.iprogsms.sender_name') ?: env('IPROG_SMS_SENDER_NAME') ?: env('SMS_SENDER_NAME');

            $lowerUrl = strtolower($apiUrl);
            $isUniSms = str_contains($lowerUrl, 'unisms') || str_starts_with($apiKey, 'sk_');
            $isSemaphore = str_contains($lowerUrl, 'semaphore');

            if ($isUniSms) {
                // UniSMS API (https://unismsapi.com/api/sms)
                // Note: UniSMS default test sender ID is "Unisoft" (supports Globe/DITO in testing)
                $intlNumber = '+63' . substr($cleanNumber, 1);
                $payload = [
                    'recipient' => $intlNumber,
                    'content'   => $message,
                    'sender_id' => !empty($senderName) ? $senderName : 'Unisoft',
                ];
                $response = Http::timeout(10)
                    ->withBasicAuth($apiKey, '')
                    ->withHeaders([
                        'Accept'       => 'application/json',
                        'Content-Type' => 'application/json',
                    ])
                    ->post($apiUrl, $payload);
            } elseif ($isSemaphore) {
                $payload = [
                    'apikey'  => $apiKey,
                    'number'  => $cleanNumber,
                    'message' => $message,
                ];
                if (!empty($senderName)) {
                    $payload['sendername'] = $senderName;
                }
                $response = Http::timeout(10)->asForm()->post($apiUrl, $payload);
            } else {
                $payload = [
                    'api_key'      => $apiKey,
                    'phone_number' => $cleanNumber,
                    'message'      => $message,
                ];
                if (!empty($senderName)) {
                    $payload['sender_name'] = $senderName;
                }
                $response = Http::timeout(10)
                    ->withHeaders([
                        'Accept'        => 'application/json',
                        'Authorization' => "Bearer {$apiKey}",
                    ])
                    ->post($apiUrl, $payload);
            }

            $resJson = $response->json();
            Log::info("SMS Gateway sent to {$cleanNumber}: status={$response->status()} body=" . $response->body());

            if ($response->successful() && (!isset($resJson['status']) || $resJson['status'] < 400) && !isset($resJson['errors'])) {
                return is_array($resJson) ? array_merge(['success' => true], $resJson) : ['success' => true, 'raw' => $response->body()];
            }

            Log::warning("SMS Gateway error response: " . $response->body());
            $errorMsg = null;
            if (is_array($resJson)) {
                if (isset($resJson['errors']) && is_array($resJson['errors'])) {
                    $flattened = [];
                    foreach ($resJson['errors'] as $field => $errs) {
                        $flattened[] = $field . ': ' . (is_array($errs) ? implode(', ', $errs) : $errs);
                    }
                    $errorMsg = implode('; ', $flattened);
                } else {
                    $errorMsg = $resJson['message'] ?? $resJson['error'] ?? null;
                }
            }
            if (!$errorMsg) {
                $errorMsg = $response->body() ?: 'Gateway returned HTTP status ' . $response->status();
            }

            return [
                'success' => false,
                'status'  => $response->status(),
                'message' => $errorMsg,
                'error'   => $errorMsg,
                'raw'     => $resJson,
            ];
        } catch (\Throwable $e) {
            Log::error("SMS Gateway dispatch failed to {$cleanNumber}: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Send Equipment Borrowing Confirmation SMS.
     */
    public static function sendBorrowingConfirmation($borrowing): ?array
    {
        $contactNumber = $borrowing->contact_number 
            ?? $borrowing->requestor_contact_number 
            ?? $borrowing->borrower_contact_number 
            ?? null;

        if (!$contactNumber) {
            return null;
        }

        $requestorName = $borrowing->filer_name 
            ?? $borrowing->requestor_name 
            ?? $borrowing->borrower_name 
            ?? 'Borrower';

        $refCode = $borrowing->reference_code 
            ?? $borrowing->trackingNumber?->reference_code 
            ?? "EQ-2026-{$borrowing->id}";

        $sched = \App\Mail\BookingConfirmationMail::formatSchedule($borrowing);

        $message = "FSUU Equipment Borrowing: Good day, {$requestorName}! Your request [{$refCode}] ({$sched}) has been received. Pickup Notice: Please present your School ID at the AVR Center office before scheduled time.";

        $res = self::send($contactNumber, $message);

        \App\Models\CommunicationLog::record([
            'channel'         => 'sms',
            'category'        => 'equipment_confirmation',
            'recipient_name'  => $requestorName,
            'recipient_phone' => $contactNumber,
            'reference_code'  => $refCode,
            'subject'         => "SMS: Equipment Borrowing Received",
            'message_preview' => $message,
            'status'          => $res ? 'sent' : 'queued',
        ]);

        return $res;
    }

    /**
     * Send Overdue / Past Due Reminder SMS when physical equipment is past scheduled return time.
     */
    public static function sendOverdueAlert($borrowing, ?int $minutesLate = null): ?array
    {
        $contactNumber = $borrowing->contact_number 
            ?? $borrowing->requestor_contact_number 
            ?? $borrowing->borrower_contact_number 
            ?? null;

        $requestorName = $borrowing->filer_name 
            ?? $borrowing->requestor_name 
            ?? $borrowing->borrower_name 
            ?? 'Borrower';

        $refCode = $borrowing->reference_code 
            ?? $borrowing->trackingNumber?->reference_code 
            ?? "EQ-2026-{$borrowing->id}";

        $sched = \App\Mail\BookingConfirmationMail::formatSchedule($borrowing);
        $lateNote = $minutesLate ? " ({$minutesLate} mins late)" : "";

        $message = "The scheduled return time for the equipment unit(s) borrowed under Reference Code {$refCode} has elapsed. Please return all physical units immediately to the PMO / AVR office finalize condition clearance and prevent late policy penalties.";

        $res = null;
        if ($contactNumber) {
            $smsMsg = "URGENT FSUU NOTICE: Good day, {$requestorName}. {$message}";
            $res = self::send($contactNumber, $smsMsg);

            \App\Models\CommunicationLog::record([
                'channel'         => 'sms',
                'category'        => 'overdue_reminder',
                'recipient_name'  => $requestorName,
                'recipient_phone' => $contactNumber,
                'reference_code'  => $refCode,
                'subject'         => "SMS: Return Past Due Notice [{$refCode}]",
                'message_preview' => $smsMsg,
                'status'          => $res ? 'sent' : 'queued',
            ]);
        }

        // Dual Dispatch: Send Email Reminder (Return Past Due Notice)
        $email = $borrowing->email_address ?? $borrowing->requestor_email ?? $borrowing->email ?? $borrowing->filer_email ?? null;
        if ($email) {
            try {
                Mail::to($email)->send(new BookingStatusUpdateMail('equipment', $borrowing, 'overdue', $message));
                \App\Models\CommunicationLog::record([
                    'channel'         => 'email',
                    'category'        => 'overdue_reminder',
                    'recipient_name'  => $requestorName,
                    'recipient_email' => $email,
                    'reference_code'  => $refCode,
                    'subject'         => "Return Past Due Notice: [{$refCode}]",
                    'message_preview' => $message,
                    'status'          => 'sent',
                ]);
            } catch (\Throwable $e) {
                Log::warning("SmsService: Dual Email dispatch for overdue failed: " . $e->getMessage());
            }
        }

        return $res;
    }

    /**
     * Send Upcoming Due / Grace Period Advance Reminder (e.g. 15 minutes before scheduled return time).
     */
    public static function sendUpcomingDueReminder($borrowing, int $minutesRemaining = 15): ?array
    {
        $contactNumber = $borrowing->contact_number 
            ?? $borrowing->requestor_contact_number 
            ?? $borrowing->borrower_contact_number 
            ?? null;

        if (!$contactNumber) {
            return null;
        }

        $requestorName = $borrowing->filer_name 
            ?? $borrowing->requestor_name 
            ?? $borrowing->borrower_name 
            ?? 'Borrower';

        $refCode = $borrowing->reference_code 
            ?? $borrowing->trackingNumber?->reference_code 
            ?? "EQ-2026-{$borrowing->id}";

        $sched = \App\Mail\BookingConfirmationMail::formatSchedule($borrowing);

        $message = "FSUU AVR Reminder: Good day, {$requestorName}. Your borrowed equipment [{$refCode}] ({$sched}) is due for return in {$minutesRemaining} mins. Please return it promptly to avoid late return penalties.";

        $res = self::send($contactNumber, $message);

        \App\Models\CommunicationLog::record([
            'channel'         => 'sms',
            'category'        => 'urgent_reminder',
            'recipient_name'  => $requestorName,
            'recipient_phone' => $contactNumber,
            'reference_code'  => $refCode,
            'subject'         => "SMS: Due Time Advance Reminder",
            'message_preview' => $message,
            'status'          => $res ? 'sent' : 'queued',
        ]);

        // Dual Dispatch: Also send Email Advance Reminder
        $email = $borrowing->email_address ?? $borrowing->requestor_email ?? $borrowing->email ?? $borrowing->filer_email ?? null;
        if ($email) {
            try {
                Mail::to($email)->send(new BookingStatusUpdateMail('equipment', $borrowing, 'due_soon', $message));
                \App\Models\CommunicationLog::record([
                    'channel'         => 'email',
                    'category'        => 'urgent_reminder',
                    'recipient_name'  => $requestorName,
                    'recipient_email' => $email,
                    'reference_code'  => $refCode,
                    'subject'         => "Email: Due Time Advance Reminder [{$refCode}]",
                    'message_preview' => $message,
                    'status'          => 'sent',
                ]);
            } catch (\Throwable $e) {
                Log::warning("SmsService: Dual Email dispatch for due reminder failed: " . $e->getMessage());
            }
        }

        return $res;
    }

    /**
     * Send Return Equipment Reminder SMS.
     */
    public static function sendReturnReminder($borrowing, ?string $customMessage = null): ?array
    {
        $contactNumber = $borrowing->contact_number 
            ?? $borrowing->requestor_contact_number 
            ?? $borrowing->borrower_contact_number 
            ?? null;

        if (!$contactNumber) {
            return null;
        }

        $requestorName = $borrowing->filer_name 
            ?? $borrowing->requestor_name 
            ?? $borrowing->borrower_name 
            ?? 'Borrower';

        $refCode = $borrowing->reference_code 
            ?? $borrowing->trackingNumber?->reference_code 
            ?? "EQ-2026-{$borrowing->id}";

        $sched = \App\Mail\BookingConfirmationMail::formatSchedule($borrowing);

        $message = $customMessage ?: "FSUU AVR Reminder: Good day, {$requestorName}. Please be reminded to return the borrowed equipment units for request [{$refCode}] ({$sched}) to the AVR Center office. Thank you!";

        $res = self::send($contactNumber, $message);

        \App\Models\CommunicationLog::record([
            'channel'         => 'sms',
            'category'        => 'return_reminder',
            'recipient_name'  => $requestorName,
            'recipient_phone' => $contactNumber,
            'reference_code'  => $refCode,
            'subject'         => "SMS: Equipment Return Notice",
            'message_preview' => $message,
            'status'          => $res ? 'sent' : 'queued',
        ]);

        // Dual Dispatch: Also send Email Return Notice
        $email = $borrowing->email_address ?? $borrowing->requestor_email ?? $borrowing->email ?? $borrowing->filer_email ?? null;
        if ($email) {
            try {
                Mail::to($email)->send(new BookingStatusUpdateMail('equipment', $borrowing, 'return_reminder', $message));
                \App\Models\CommunicationLog::record([
                    'channel'         => 'email',
                    'category'        => 'return_reminder',
                    'recipient_name'  => $requestorName,
                    'recipient_email' => $email,
                    'reference_code'  => $refCode,
                    'subject'         => "Email: Equipment Return Notice [{$refCode}]",
                    'message_preview' => $message,
                    'status'          => 'sent',
                ]);
            } catch (\Throwable $e) {
                Log::warning("SmsService: Dual Email dispatch for return reminder failed: " . $e->getMessage());
            }
        }

        return $res;
    }

    /**
     * Send general status update SMS (e.g. Approved, Rejected, Cancelled, Ready for Claim).
     */
    public static function sendStatusNotification(string $type, $booking, string $status, ?string $remarks = null): ?array
    {
        $contactNumber = $booking->contact_number 
            ?? $booking->requestor_contact_number 
            ?? $booking->borrower_contact_number 
            ?? null;

        if (!$contactNumber) {
            return null;
        }

        $requestorName = $booking->filer_name 
            ?? $booking->requestor_name 
            ?? $booking->borrower_name 
            ?? 'Client';

        $refCode = $booking->reference_code 
            ?? $booking->trackingNumber?->reference_code 
            ?? ($type === 'venue' ? "TRK-AVR-{$booking->id}" : "EQ-2026-{$booking->id}");

        $statusNorm = strtolower(str_replace(['_', '-'], ' ', (string)$status));
        $statusUpper = strtoupper($status);
        $typeLabel = $type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing';
        $remarksNote = $remarks ? " Note: {$remarks}" : "";

        if (in_array($statusNorm, ['late return', 'late_return', 'overdue'], true)) {
            $message = "URGENT FSUU NOTICE: Good day, {$requestorName}. The scheduled return time for {$typeLabel} [{$refCode}] has elapsed. Please return all physical units immediately to the PMO / AVR office to finalize clearance and avoid penalties.";
        } elseif (in_array($statusNorm, ['exceed end time', 'exceeded', 'exceeded end time'], true)) {
            $message = "URGENT FSUU NOTICE: Good day, {$requestorName}. Your {$typeLabel} [{$refCode}] has exceeded its scheduled reservation end time. Please conclude your activity immediately or contact AVR custodial staff.";
        } else {
            // All non-overdue/exceeded status changes are dispatched via Email only
            return null;
        }

        $res = self::send($contactNumber, $message);

        \App\Models\CommunicationLog::record([
            'channel'         => 'sms',
            'category'        => 'status_update',
            'recipient_name'  => $requestorName,
            'recipient_phone' => $contactNumber,
            'reference_code'  => $refCode,
            'subject'         => "SMS: Status Update ({$statusUpper})",
            'message_preview' => $message,
            'status'          => $res ? 'sent' : 'queued',
        ]);

        return $res;
    }
}
