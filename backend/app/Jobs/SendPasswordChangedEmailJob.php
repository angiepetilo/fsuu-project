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

class SendPasswordChangedEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [15, 30, 60];
    public int $timeout = 30;

    public function __construct(
        public readonly string $email,
        public readonly string $userName,
        public readonly ?string $ipAddress = null,
        public readonly ?string $deviceSummary = null
    ) {}

    public function handle(): void
    {
        $email = trim($this->email);
        $name = trim($this->userName) ?: 'Staff Member';
        $ip = $this->ipAddress ?: 'Unknown IP';
        $device = $this->deviceSummary ?: 'Web Browser';

        if (empty($email)) {
            Log::warning('SendPasswordChangedEmailJob: Missing email address.');
            return;
        }

        SystemSetting::configureMailer();

        $subject = 'Security Alert: Your FSUU Password Was Changed';
        $html = $this->buildEmailHtml($name, $ip, $device, $email);

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
            Log::warning("SendPasswordChangedEmailJob default mailer failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                Mail::mailer('smtp')->send([], [], function ($message) use ($email, $subject, $html) {
                    $message->to($email)
                        ->subject($subject)
                        ->html($html);
                });
                $mailSent = true;
            } catch (\Throwable $err) {
                $mailError = $err->getMessage();
                Log::error("SendPasswordChangedEmailJob failed on both mailers: " . $err->getMessage());
            }
        }

        CommunicationLog::record([
            'channel'         => 'email',
            'category'        => 'security_alert',
            'recipient_name'  => $name,
            'recipient_email' => $email,
            'recipient_phone' => null,
            'reference_code'  => 'SEC-ALERT',
            'subject'         => $subject,
            'message_preview' => "Password changed notification dispatched to {$email}",
            'status'          => $mailSent ? 'sent' : 'failed',
            'error_message'   => $mailError,
        ]);
    }

    private function buildEmailHtml(string $name, string $ip, string $device, string $email): string
    {
        $date = now()->format('F j, Y - g:i A');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Alert — FSUU Staff Portal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 24px; color: #1e293b; }
    .wrap { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header h1 { font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
    .header p { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; }
    .content { padding: 36px 32px; text-align: left; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .sub { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    .alert-box { background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .alert-title { font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px; }
    .alert-desc { font-size: 12px; color: #7f1d1d; line-height: 1.5; margin: 0; }
    .detail-card { background: #f8fafc; border-radius: 12px; padding: 16px; font-size: 12px; color: #334155; margin-bottom: 24px; line-height: 1.8; }
    .detail-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 6px 0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #64748b; }
    .detail-value { font-weight: 700; color: #0f172a; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Father Saturnino Urios University</h1>
      <p>Security &amp; Account Protection Notification</p>
    </div>
    <div class="content">
      <div class="greeting">Hello, {$name}</div>
      <div class="sub">
        This notification confirms that the password for your FSUU Staff account (<strong>{$email}</strong>) was successfully updated.
      </div>

      <div class="detail-card">
        <div class="detail-row"><span class="detail-label">Time of Change:</span><span class="detail-value">{$date}</span></div>
        <div class="detail-row"><span class="detail-label">IP Address:</span><span class="detail-value">{$ip}</span></div>
        <div class="detail-row"><span class="detail-label">Client / Device:</span><span class="detail-value">{$device}</span></div>
        <div class="detail-row"><span class="detail-label">Active Sessions:</span><span class="detail-value" style="color:#16a34a;">All Previous Sessions Revoked</span></div>
      </div>

      <div class="alert-box">
        <div class="alert-title">Did you not make this change?</div>
        <p class="alert-desc">
          If you did not authorize this password reset, your university credentials may have been compromised. Please immediately contact your IT Department or the Super Administrator to freeze and secure your account.
        </p>
      </div>
    </div>
    <div class="footer">
      © Father Saturnino Urios University · Facilities &amp; Equipment Booking System
    </div>
  </div>
</body>
</html>
HTML;
    }
}
