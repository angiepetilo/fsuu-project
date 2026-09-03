<?php

namespace App\Jobs;

use App\Models\CommunicationLog;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendOtpSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [15, 30, 60];
    public int $timeout = 20;

    public function __construct(
        public readonly string $phoneNumber,
        public readonly string $otpCode
    ) {}

    public function handle(): void
    {
        $phone = trim($this->phoneNumber);
        $code = $this->otpCode;

        if (empty($phone) || empty($code)) {
            Log::warning('SendOtpSmsJob: Missing phone number or OTP code.');
            return;
        }

        $message = "FSUU Equipment Borrowing: Your mobile verification code is {$code}. Valid for 10 minutes. Do not share this code with anyone.";

        $res = SmsService::send($phone, $message);

        CommunicationLog::record([
            'channel'         => 'sms',
            'category'        => 'phone_verification',
            'recipient_name'  => 'Equipment Borrowing Requestor',
            'recipient_phone' => $phone,
            'recipient_email' => null,
            'reference_code'  => 'OTP-SMS',
            'subject'         => 'SMS: Mobile Verification Code',
            'message_preview' => $message,
            'status'          => $res ? 'sent' : 'dispatched',
            'error_message'   => null,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendOtpSmsJob permanently failed', [
            'phone' => $this->phoneNumber,
            'error' => $e->getMessage(),
        ]);
    }
}
