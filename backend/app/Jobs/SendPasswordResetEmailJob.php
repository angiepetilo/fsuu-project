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

class SendPasswordResetEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [15, 30, 60];
    public int $timeout = 30;

    public function __construct(
        public readonly string $email,
        public readonly string $userName,
        public readonly string $otpCode,
        public readonly string $resetToken
    ) {}

    public function handle(): void
    {
        $email = trim($this->email);
        $name = trim($this->userName) ?: 'Staff Member';
        $code = $this->otpCode;
        $token = $this->resetToken;

        if (empty($email) || empty($code) || empty($token)) {
            Log::warning('SendPasswordResetEmailJob: Missing email, OTP code, or reset token.');
            return;
        }

        // Apply dynamic DB SMTP settings if configured
        SystemSetting::configureMailer();

        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $resetUrl = "{$frontendUrl}/reset-password?token=" . urlencode($token) . "&email=" . urlencode($email);

        $subject = 'FSUU Staff Portal — Password Reset Request';
        $html = $this->buildEmailHtml($name, $code, $resetUrl, $email);

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
            Log::warning("SendPasswordResetEmailJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->send([], [], function ($message) use ($email, $subject, $html) {
                    $message->to($email)
                        ->subject($subject)
                        ->html($html);
                });
                $mailSent = true;
            } catch (\Throwable $err) {
                $mailError = $err->getMessage();
                Log::error("SendPasswordResetEmailJob failed on both mailers: " . $err->getMessage());
            }
        }

        // Record in communication logs
        CommunicationLog::record([
            'channel'         => 'email',
            'category'        => 'password_reset',
            'recipient_name'  => $name,
            'recipient_email' => $email,
            'recipient_phone' => null,
            'reference_code'  => 'PWD-RESET',
            'subject'         => $subject,
            'message_preview' => "Password reset code dispatched to {$email}",
            'status'          => $mailSent ? 'sent' : 'failed',
            'error_message'   => $mailError,
        ]);
    }

    private function buildEmailHtml(string $name, string $code, string $resetUrl, string $email): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset Request — FSUU Staff Portal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 24px; color: #1e293b; }
    .wrap { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header h1 { font-size: 22px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
    .header p { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; }
    .content { padding: 36px 32px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .sub { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 28px; }
    .code-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 28px; }
    .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
    .code { font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #2563eb; font-family: monospace; }
    .expires { font-size: 12px; color: #94a3b8; margin-top: 8px; font-weight: 500; }
    .button { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin-bottom: 28px; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
    .security-notice { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 16px; text-align: left; font-size: 12px; color: #92400e; line-height: 1.5; margin-bottom: 24px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Father Saturnino Urios University</h1>
      <p>Facilities &amp; Equipment Booking System — Staff Portal</p>
    </div>
    <div class="content">
      <div class="greeting">Hello, {$name}</div>
      <div class="sub">
        We received a request to reset your password for your FSUU Staff account. You can enter the 6-digit verification code on the reset page, or click the direct button below.
      </div>

      <div class="code-box">
        <div class="code-label">6-Digit Security Code</div>
        <div class="code">{$code}</div>
        <div class="expires">⏱ Code expires in 10 minutes</div>
      </div>

      <div>
        <a href="{$resetUrl}" class="button" target="_blank" rel="noopener noreferrer">
          Reset Password Directly →
        </a>
      </div>

      <div class="security-notice">
        <strong>🔒 Security Advisory:</strong> If you did NOT request a password reset, someone may be attempting to access your account. Your current password remains safe and no changes have been made. You can safely disregard this email, or alert the Super Administrator if you suspect suspicious activity.
      </div>

      <p style="font-size:11px;color:#94a3b8;margin:0;">Requested for account: {$email}</p>
    </div>
    <div class="footer">
      © Father Saturnino Urios University · Butuan City, Agusan del Norte, Philippines
    </div>
  </div>
</body>
</html>
HTML;
    }
}
