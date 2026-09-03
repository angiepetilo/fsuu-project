<?php

namespace App\Jobs;

use App\Models\CommunicationLog;
use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOtpEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [15, 30, 60];
    public int $timeout = 30;

    public function __construct(
        public readonly string $email,
        public readonly string $otpCode
    ) {}

    public function handle(): void
    {
        $email = trim($this->email);
        $code = $this->otpCode;

        if (empty($email) || empty($code)) {
            Log::warning('SendOtpEmailJob: Missing email or OTP code.');
            return;
        }

        // Dynamically apply database-configured SMTP settings
        SystemSetting::configureMailer();

        $subject = 'FSUU Booking System — Your Email Verification Code';
        $html = $this->buildEmailHtml($code, $email);

        $mailSent = false;
        $mailError = null;

        try {
            Mail::send([], [], function ($message) use ($email, $subject, $html) {
                $message->to($email)
                    ->subject($subject)
                    ->html($html);
            });
            $mailSent = true;
        } catch (\Throwable $e) {
            Log::warning("SendOtpEmailJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->send([], [], function ($message) use ($email, $subject, $html) {
                    $message->to($email)
                        ->subject($subject)
                        ->html($html);
                });
                $mailSent = true;
            } catch (\Throwable $err) {
                $mailError = $err->getMessage();
                Log::error("SendOtpEmailJob failed on both mailers: " . $err->getMessage());
            }
        }

        // Record in communication logs
        CommunicationLog::record([
            'channel'         => 'email',
            'category'        => 'email_verification',
            'recipient_name'  => 'Venue Booking Requestor',
            'recipient_email' => $email,
            'recipient_phone' => null,
            'reference_code'  => 'OTP-EMAIL',
            'subject'         => $subject,
            'message_preview' => "6-digit OTP code dispatched to {$email}",
            'status'          => $mailSent ? 'sent' : 'failed',
            'error_message'   => $mailError,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendOtpEmailJob permanently failed', [
            'email' => $this->email,
            'error' => $e->getMessage(),
        ]);
    }

    private function buildEmailHtml(string $code, string $email): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verification Code — FSUU</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }
    .wrap { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0f1c3f, #1e3a8a); padding: 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 20px; margin: 0 0 4px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.6); font-size: 12px; margin: 0; }
    .body { padding: 36px; text-align: center; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .sub { font-size: 13px; color: #475569; margin-bottom: 28px; line-height: 1.7; }
    .code-box { background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .code { font-size: 40px; font-weight: 900; color: #1d4ed8; letter-spacing: 10px; font-family: 'Courier New', monospace; }
    .expires { font-size: 11px; color: #94a3b8; margin-top: 8px; }
    .warning { background: #fef9c3; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #713f12; margin-bottom: 20px; text-align: left; }
    .footer { background: #f8faff; border-top: 1px solid #e8edf5; padding: 16px; text-align: center; font-size: 10px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🎓 FSUU Facilities &amp; Booking System</h1>
      <p>Father Saturnino Urios University, Butuan City</p>
    </div>
    <div class="body">
      <p class="greeting">Venue Reservation Email Verification</p>
      <p class="sub">
        You requested a verification code for your venue booking submission.<br>
        Enter the 6-digit code below in your booking form to proceed.
      </p>
      <div class="code-box">
        <div class="code">{$code}</div>
        <div class="expires">⏱ Expires in 10 minutes</div>
      </div>
      <div class="warning">
        ⚠ <strong>Do not share this code</strong> with anyone. FSUU staff will never ask for your verification code.
      </div>
      <p style="font-size:12px;color:#94a3b8;">Sent to: {$email}</p>
    </div>
    <div class="footer">
      © FSUU Facilities &amp; Equipment Booking System — Father Saturnino Urios University, Butuan City
    </div>
  </div>
</body>
</html>
HTML;
    }
}
