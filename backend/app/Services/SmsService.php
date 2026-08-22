<?php

namespace App\Services;

use App\Models\EquipmentBorrowing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public static bool $smsEnabled = false;

    /**
     * Send an SMS via iPROG SMS API (or Semaphore fallback).
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

        $iprogKey = config('services.iprogsms.api_key') ?: env('IPROG_SMS_API_KEY');
        $semaphoreKey = env('SEMAPHORE_API_KEY');

        if (empty($iprogKey) && empty($semaphoreKey)) {
            Log::warning("SmsService: Neither IPROG_SMS_API_KEY nor SEMAPHORE_API_KEY is configured in .env.");
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

        // 1. Primary: iPROG SMS Gateway (https://www.iprogsms.com/api/v1/documentation)
        if (!empty($iprogKey)) {
            try {
                $apiUrl = config('services.iprogsms.api_url') ?: env('IPROG_SMS_API_URL', 'https://sms.iprogtech.com/api/v1/sms_messages');
                $senderName = config('services.iprogsms.sender_name') ?: env('IPROG_SMS_SENDER_NAME');

                $payload = [
                    'api_key'      => $iprogKey,
                    'phone_number' => $cleanNumber,
                    'message'      => $message,
                ];
                if (!empty($senderName)) {
                    $payload['sender_name'] = $senderName;
                }

                $response = Http::timeout(10)
                    ->withHeaders([
                        'Accept'        => 'application/json',
                        'Authorization' => "Bearer {$iprogKey}",
                    ])
                    ->post($apiUrl, $payload);

                $resJson = $response->json();
                Log::info("iProgSMS sent to {$cleanNumber}: status={$response->status()} body=" . $response->body());

                // If iProg succeeded (HTTP 200/201 and not error status 500)
                if ($response->successful() && (!isset($resJson['status']) || $resJson['status'] < 400)) {
                    return $resJson;
                }

                Log::warning("iProgSMS returned error, falling back to backup gateway if available: " . $response->body());
            } catch (\Throwable $e) {
                Log::error("iProgSMS failed to send to {$cleanNumber}: " . $e->getMessage());
            }
        }

        // 2. Fallback: Semaphore SMS Gateway
        if (!empty($semaphoreKey)) {
            try {
                $senderName = env('SEMAPHORE_SENDER_NAME', 'SEMAPHORE');
                $response = Http::timeout(10)->post('https://api.semaphore.co/api/v4/messages', [
                    'apikey'     => $semaphoreKey,
                    'number'     => $cleanNumber,
                    'message'    => $message,
                    'sendername' => $senderName,
                ]);

                Log::info("Semaphore sent to {$cleanNumber}: " . $response->body());
                return $response->json();
            } catch (\Throwable $e) {
                Log::error("Semaphore failed to send SMS to {$cleanNumber}: " . $e->getMessage());
                return null;
            }
        }

        return null;
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

        $message = "FSUU Equipment Borrowing: Good day, {$requestorName}! Your request has been received. Reference Code: {$refCode}. Pickup Notice: Please present your School ID at the AVR Center office before scheduled time.";

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

        $lateNote = $minutesLate ? " ({$minutesLate} mins late)" : "";

        $message = "URGENT FSUU NOTICE: Good day, {$requestorName}. Your borrowed equipment [{$refCode}] is now OVERDUE for return{$lateNote}. Please return all physical units immediately to the AVR Center to avoid violation records.";

        $res = self::send($contactNumber, $message);

        \App\Models\CommunicationLog::record([
            'channel'         => 'sms',
            'category'        => 'overdue_reminder',
            'recipient_name'  => $requestorName,
            'recipient_phone' => $contactNumber,
            'reference_code'  => $refCode,
            'subject'         => "SMS: Urgent Overdue Reminder",
            'message_preview' => $message,
            'status'          => $res ? 'sent' : 'queued',
        ]);

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

        $endTime = $borrowing->time_end ? substr((string)$borrowing->time_end, 0, 5) : 'scheduled time';

        $message = "FSUU AVR Reminder: Good day, {$requestorName}. Your borrowed equipment [{$refCode}] is due for return in {$minutesRemaining} mins ({$endTime}). Please return it promptly to avoid late return penalties.";

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

        return $res;
    }
}
