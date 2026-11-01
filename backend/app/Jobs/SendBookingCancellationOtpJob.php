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

class SendBookingCancellationOtpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [15, 30, 60];
    public int $timeout = 30;

    public function __construct(
        public readonly string $email,
        public readonly string $recipientName,
        public readonly string $referenceCode,
        public readonly string $otpCode,
        public readonly int $expireMinutes = 10
    ) {}

    public function handle(): void
    {
        $email = trim($this->email);
        $name = trim($this->recipientName) ?: 'Valued Borrower';
        $code = $this->otpCode;
        $refCode = $this->referenceCode;

        if (empty($email) || empty($code) || empty($refCode)) {
            Log::warning('SendBookingCancellationOtpJob: Missing email, OTP code, or reference code.');
            return;
        }

        SystemSetting::configureMailer();

        $subject = "Cancellation Verification Code: [{$refCode}]";
        $html = $this->buildEmailHtml($name, $code, $refCode);

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
            Log::warning("SendBookingCancellationOtpJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->send([], [], function ($message) use ($email, $subject, $html) {
                    $message->to($email)
                        ->subject($subject)
                        ->html($html);
                });
                $mailSent = true;
            } catch (\Throwable $err) {
                $mailError = $err->getMessage();
                Log::error("SendBookingCancellationOtpJob failed on both mailers: " . $err->getMessage());
            }
        }

        try {
            CommunicationLog::record([
                'channel'         => 'email',
                'category'        => 'cancellation_otp',
                'recipient_name'  => $name,
                'recipient_email' => $email,
                'recipient_phone' => null,
                'reference_code'  => $refCode,
                'subject'         => $subject,
                'message_preview' => "Your 6-digit cancellation verification code for [{$refCode}] is: {$code}. Valid for {$this->expireMinutes} minutes.",
                'status'          => $mailSent ? 'sent' : 'failed',
                'error_message'   => $mailError,
            ]);
        } catch (\Throwable $t) {
            Log::error('SendBookingCancellationOtpJob communication log error: ' . $t->getMessage());
        }
    }

    private function buildEmailHtml(string $name, string $code, string $refCode): string
    {
        $sysSettings = SystemSetting::getSettings();
        $systemName = $sysSettings->system_name ?: 'FSUU Reserve & Booking System';
        $orgName = $sysSettings->organization_name ?: 'Father Saturnino Urios University';
        $contactEmail = $sysSettings->contact_email ?: 'support@urios.edu.ph';
        $contactPhone = $sysSettings->contact_phone ?: '';
        $mins = $this->expireMinutes;

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancellation Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0f172a; background-color: #f1f5f9; margin: 0; padding: 24px 12px; }
    .wrapper { max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }
    .top-banner { background-color: #7f1d1d; border-bottom: 3px solid #ef4444; padding: 20px 24px; text-align: center; color: #ffffff; }
    .header-title { font-size: 15px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 0; color: #ffffff; }
    .header-sub { font-size: 11.5px; color: rgba(255, 255, 255, 0.85); margin-top: 4px; }
    .content { padding: 28px 24px; }
    .code-box { background-color: #fef2f2; border: 2px dashed #f87171; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b91c1c; font-family: 'Courier New', Courier, monospace; }
    .code-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #991b1b; letter-spacing: 1px; margin-bottom: 6px; }
    .alert-box { background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e; margin-top: 20px; }
    .signoff { margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="top-banner">
      <div class="header-title">{$orgName}</div>
      <div class="header-sub">{$systemName} &bull; Verification Notice</div>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">Cancellation Request Verification</h2>
      <p style="font-size: 13.5px; color: #475569; margin: 0 0 16px 0;">
        Hello <strong>{$name}</strong>,
      </p>
      <p style="font-size: 13.5px; color: #475569; margin: 0 0 16px 0;">
        A request was made to cancel the reservation with reference code <strong style="color: #0f172a;">[{$refCode}]</strong>. To confirm that you authorized this cancellation, please enter the one-time code below on the tracking page:
      </p>

      <div class="code-box">
        <div class="code-label">One-Time Verification Code</div>
        <div class="otp-code">{$code}</div>
        <div style="font-size: 11px; color: #7f1d1d; margin-top: 6px;">Valid for <strong>{$mins} minutes</strong> &bull; Single-use only</div>
      </div>

      <div class="alert-box">
        <strong>Security Notice:</strong> If you did not request to cancel this booking, please ignore this email. Your reservation remains active and safe. Never share this code with anyone.
      </div>

      <div class="signoff">
        Respectfully,<br>
        <strong>{$systemName}</strong><br>
        {$orgName}<br>
        Support: <a href="mailto:{$contactEmail}" style="color: #2563eb;">{$contactEmail}</a>
        {$contactPhone}
      </div>
    </div>
  </div>
</body>
</html>
HTML;
    }
}
