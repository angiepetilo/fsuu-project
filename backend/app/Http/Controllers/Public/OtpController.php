<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class OtpController extends Controller
{
    /**
     * Generate and send a 6-digit verification code to the provided email.
     * POST /api/public/send-otp
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = $request->input('email');

        // Generate a 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store in cache keyed by email — expires in 10 minutes
        $cacheKey = 'otp_' . hash('sha256', $email);
        Cache::put($cacheKey, $code, now()->addMinutes(10));

        // Send the email
        Mail::send([], [], function ($message) use ($email, $code) {
            $message->to($email)
                ->subject('FSUU Booking System — Your Verification Code')
                ->html($this->buildEmailHtml($code, $email));
        });

        return response()->json([
            'message' => 'Verification code sent successfully. Please check your inbox.',
        ]);
    }

    /**
     * Verify the submitted code against the cached one.
     * POST /api/public/verify-otp
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code'  => 'required|string|size:6',
        ]);

        $email    = $request->input('email');
        $code     = $request->input('code');
        $cacheKey = 'otp_' . hash('sha256', $email);

        $stored = Cache::get($cacheKey);

        if (! $stored) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new one.',
            ], 422);
        }

        if ($stored !== $code) {
            return response()->json([
                'message' => 'Incorrect verification code. Please try again.',
            ], 422);
        }

        // Consume the code — one-time use
        Cache::forget($cacheKey);

        return response()->json([
            'message'  => 'Email verified successfully.',
            'verified' => true,
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
      <h1>🎓 FSUU Reserve &amp; Booking System</h1>
      <p>Father Saturnino Urios University, Butuan City</p>
    </div>
    <div class="body">
      <p class="greeting">Email Verification</p>
      <p class="sub">
        You requested a verification code for your booking submission.<br>
        Enter the code below in the booking form to proceed.
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
      © FSUU Reserve and Booking System — Father Saturnino Urios University, Butuan City
    </div>
  </div>
</body>
</html>
HTML;
    }
}
