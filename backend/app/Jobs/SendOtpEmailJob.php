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
        public readonly string $otpCode,
        public readonly string $type = 'venue'
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

        $isEquipment = strtolower($this->type) === 'equipment';
        $subject = $isEquipment 
            ? 'FSUU Equipment Borrowing — Your Email Verification Code' 
            : 'FSUU Venue Reservation — Your Email Verification Code';
        $html = $this->buildEmailHtml($code, $email, $this->type);

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
            'recipient_name'  => $isEquipment ? 'Equipment Borrowing Requestor' : 'Venue Booking Requestor',
            'recipient_email' => $email,
            'recipient_phone' => null,
            'reference_code'  => $isEquipment ? 'OTP-EQUIPMENT' : 'OTP-VENUE',
            'subject'         => $subject,
            'message_preview' => "6-digit OTP code dispatched to {$email} for " . ($isEquipment ? 'equipment borrowing' : 'venue booking'),
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

    private function buildEmailHtml(string $code, string $email, string $type = 'venue'): string
    {
        $isEquipment = strtolower($type) === 'equipment';
        $title = $isEquipment ? 'Equipment Borrowing Email Verification' : 'Venue Reservation Email Verification';
        $sub = $isEquipment
            ? 'You requested a verification code for your equipment borrowing request.<br>Enter the 6-digit code below in your borrowing form to proceed.'
            : 'You requested a verification code for your venue booking submission.<br>Enter the 6-digit code below in your booking form to proceed.';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification — FSUU</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #0f172a;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px 12px;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }
    .top-banner {
      background-color: #0f172a;
      color: #ffffff;
      padding: 24px;
      text-align: center;
      border-bottom: 3px solid #2563eb;
    }
    .header-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
      color: #ffffff;
    }
    .header-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .content {
      padding: 28px 24px;
    }
    .badge-pill {
      display: inline-block;
      background-color: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
    }
    .email-heading {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px 0;
      letter-spacing: -0.3px;
    }
    .intro-text {
      font-size: 13.5px;
      color: #475569;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }
    .code-container {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin-bottom: 22px;
    }
    .code-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .code-display {
      display: inline-block;
      background-color: #eff6ff;
      border: 2px dashed #93c5fd;
      border-radius: 12px;
      padding: 10px 24px;
      white-space: nowrap;
      text-align: center;
    }
    .code-number {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 4px;
      color: #1d4ed8;
      vertical-align: middle;
      margin: 0 10px;
    }
    .code-bracket {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 26px;
      font-weight: 400;
      color: #64748b;
      vertical-align: middle;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 18px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-label {
      width: 32%;
      font-weight: 700;
      color: #64748b;
    }
    .data-value {
      color: #0f172a;
      font-weight: 600;
    }
    .notice-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 22px;
      font-size: 12.5px;
      color: #1e40af;
      line-height: 1.5;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 16px 20px;
      text-align: center;
      font-size: 11.5px;
      color: #64748b;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="top-banner">
      <div class="header-title">FSUU FACILITIES &amp; BOOKING SYSTEM</div>
      <div class="header-sub">Father Saturnino Urios University, Butuan City</div>
    </div>
    <div class="content">
      <div class="badge-pill">SECURITY VERIFICATION</div>
      <h1 class="email-heading">{$title}</h1>
      <p class="intro-text">
        {$sub}
      </p>

      <div class="code-container" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 22px;">
        <div class="code-label" style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">YOUR VERIFICATION CODE:</div>
        <div class="code-display" style="display: inline-block; background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 10px 24px; white-space: nowrap; text-align: center;">
          <span class="code-bracket" style="font-family: 'SFMono-Regular', Consolas, Menlo, Monaco, monospace; font-size: 26px; font-weight: 400; color: #64748b; vertical-align: middle;">[</span>
          <span class="code-number" style="font-family: 'SFMono-Regular', Consolas, Menlo, Monaco, monospace; font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #1d4ed8; margin: 0 10px; vertical-align: middle;">{$code}</span>
          <span class="code-bracket" style="font-family: 'SFMono-Regular', Consolas, Menlo, Monaco, monospace; font-size: 26px; font-weight: 400; color: #64748b; vertical-align: middle;">]</span>
        </div>
      </div>

      <table class="data-table">
        <tr>
          <td class="data-label">Code Validity</td>
          <td class="data-value">Expires in 10 minutes</td>
        </tr>
        <tr>
          <td class="data-label">Sent to</td>
          <td class="data-value">{$email}</td>
        </tr>
      </table>

      <div class="notice-box">
        ℹ️ <strong>SECURITY NOTICE:</strong> Do not share this code with anyone. FSUU staff will never ask for your verification code.
      </div>
    </div>
    <div class="footer">
      &copy; FSUU Facilities &amp; Equipment Booking System — Father Saturnino Urios University
    </div>
  </div>
</body>
</html>
HTML;
    }
}
