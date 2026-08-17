<?php

namespace App\Services;

use App\Models\EquipmentBorrowing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send an SMS via Semaphore API.
     *
     * @param string $phoneNumber e.g. "09639556586", "+639639556586"
     * @param string $message
     * @return array|null
     */
    public static function send(string $phoneNumber, string $message): ?array
    {
        $apiKey = env('SEMAPHORE_API_KEY');

        if (empty($apiKey)) {
            Log::warning("SmsService: SEMAPHORE_API_KEY is not configured.");
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
            $senderName = env('SEMAPHORE_SENDER_NAME', 'SEMAPHORE');
            $response = Http::timeout(10)->post('https://api.semaphore.co/api/v4/messages', [
                'apikey'     => $apiKey,
                'number'     => $cleanNumber,
                'message'    => $message,
                'sendername' => $senderName,
            ]);

            Log::info("SmsService sent to {$cleanNumber}: " . $response->body());
            return $response->json();
        } catch (\Throwable $e) {
            Log::error("SmsService failed to send SMS to {$cleanNumber}: " . $e->getMessage());
            return null;
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

        $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
        $trackUrl = "{$baseUrl}/track?tracking={$refCode}";

        $message = "FSUU Equipment Borrowing: Good day, {$requestorName}! Your request is received. Tracking Code: {$refCode}. Pickup Instructions: Present your physical School ID at the office at least 15 mins before scheduled start time. Track online: {$trackUrl}";

        return self::send($contactNumber, $message);
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

        $lateNote = $minutesLate ? " ({$minutesLate} mins overdue)" : "";
        $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
        $trackUrl = "{$baseUrl}/track?tracking={$refCode}";

        $message = "URGENT FSUU NOTICE: Good day, {$requestorName}. Your borrowed equipment [{$refCode}] is now OVERDUE for return{$lateNote}. Please return the physical unit(s) immediately to the designated office to avoid university violation penalties. Track status: {$trackUrl}";

        return self::send($contactNumber, $message);
    }
}
