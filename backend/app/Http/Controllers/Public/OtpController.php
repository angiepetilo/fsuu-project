<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Jobs\SendOtpEmailJob;
use App\Models\EmailVerification;
use App\Rules\ActiveDeliverableEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class OtpController extends Controller
{
    /**
     * Generate and send a 6-digit verification code to the provided email.
     * POST /api/public/send-otp
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email', 'max:255', new ActiveDeliverableEmail],
        ]);

        $email = strtolower(trim($request->input('email')));
        $cooldownKey = 'otp_cooldown_' . hash('sha256', $email);

        // Cooldown check (60 seconds)
        if (Cache::has($cooldownKey)) {
            $remaining = Cache::get($cooldownKey) - time();
            if ($remaining > 0) {
                return response()->json([
                    'message' => "Please wait {$remaining} seconds before requesting a new verification code.",
                    'cooldown_remaining' => $remaining,
                ], 429);
            }
        }

        // Generate a cryptographically strong 6-digit numeric OTP code
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(10);

        // Save to email_verifications table
        $verification = EmailVerification::create([
            'email'      => $email,
            'otp_code'   => $code,
            'expires_at' => $expiresAt,
            'ip_address' => $request->ip(),
        ]);

        // Also cache OTP for fast lookup
        $cacheKey = 'otp_email_' . hash('sha256', $email);
        Cache::put($cacheKey, [
            'code'       => $code,
            'expires_at' => $expiresAt->timestamp,
            'id'         => $verification->id,
        ], $expiresAt);

        // Set 60-second cooldown
        Cache::put($cooldownKey, time() + 60, 60);

        // Dispatch async email job
        SendOtpEmailJob::dispatch($email, $code);

        return response()->json([
            'message'    => 'Verification code sent successfully. Please check your inbox.',
            'expires_in' => 600,
            'cooldown'   => 60,
        ]);
    }

    /**
     * Verify the submitted 6-digit code against the recorded email OTP.
     * POST /api/public/verify-otp
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'code'  => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($request->input('email')));
        $code  = trim($request->input('code'));

        // Query active pending verification record
        $record = EmailVerification::where('email', $email)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if (! $record) {
            return response()->json([
                'message' => 'Verification code has expired or was not requested. Please request a new one.',
            ], 422);
        }

        if ($record->otp_code !== $code) {
            return response()->json([
                'message' => 'Incorrect verification code. Please check your email and try again.',
            ], 422);
        }

        // Mark verified and invalidate single-use OTP
        $record->update([
            'verified_at' => now(),
            'otp_code'    => 'CONSUMED',
        ]);

        $cacheKey = 'otp_email_' . hash('sha256', $email);
        Cache::forget($cacheKey);

        return response()->json([
            'verified' => true,
            'message'  => 'Email verified successfully.',
        ]);
    }
}
