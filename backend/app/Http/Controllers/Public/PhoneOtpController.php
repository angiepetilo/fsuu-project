<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Jobs\SendOtpSmsJob;
use App\Models\PhoneVerification;
use App\Rules\ValidPhilippineMobileNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PhoneOtpController extends Controller
{
    /**
     * Generate and send a 6-digit SMS verification code to the provided phone number.
     * POST /api/public/send-phone-otp
     */
    public function send(Request $request): JsonResponse
    {
        $phoneInput = $request->input('phone_number') ?? $request->input('phone') ?? $request->input('contact_number');
        
        $request->merge(['phone_number' => $phoneInput]);
        $request->validate([
            'phone_number' => ['required', 'string', new ValidPhilippineMobileNumber],
        ]);

        $phone = PhoneVerification::normalizePhoneNumber($phoneInput);
        $cooldownKey = 'otp_phone_cooldown_' . hash('sha256', $phone);

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

        // Generate a 6-digit numeric OTP code
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(10);

        // Save to phone_verifications table
        $verification = PhoneVerification::create([
            'phone_number' => $phone,
            'otp_code'     => $code,
            'expires_at'   => $expiresAt,
            'ip_address'   => $request->ip(),
        ]);

        // Also cache OTP
        $cacheKey = 'otp_phone_' . hash('sha256', $phone);
        Cache::put($cacheKey, [
            'code'       => $code,
            'expires_at' => $expiresAt->timestamp,
            'id'         => $verification->id,
        ], $expiresAt);

        // Set 60-second cooldown
        Cache::put($cooldownKey, time() + 60, 60);

        // Dispatch async SMS job
        SendOtpSmsJob::dispatch($phone, $code);

        return response()->json([
            'message'    => 'Verification code sent successfully to your mobile number.',
            'expires_in' => 600,
            'cooldown'   => 60,
        ]);
    }

    /**
     * Verify the submitted 6-digit SMS code against the recorded phone OTP.
     * POST /api/public/verify-phone-otp
     */
    public function verify(Request $request): JsonResponse
    {
        $phoneInput = $request->input('phone_number') ?? $request->input('phone') ?? $request->input('contact_number');
        $code = trim((string) $request->input('code'));

        $request->merge(['phone_number' => $phoneInput]);
        $request->validate([
            'phone_number' => ['required', 'string'],
            'code'         => ['required', 'string', 'size:6'],
        ]);

        $phone = PhoneVerification::normalizePhoneNumber($phoneInput);

        // Query active pending verification record
        $record = PhoneVerification::where('phone_number', $phone)
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
                'message' => 'Incorrect verification code. Please check your SMS and try again.',
            ], 422);
        }

        // Mark verified and invalidate single-use OTP
        $record->update([
            'verified_at' => now(),
            'otp_code'    => 'CONSUMED',
        ]);

        $cacheKey = 'otp_phone_' . hash('sha256', $phone);
        Cache::forget($cacheKey);

        return response()->json([
            'verified' => true,
            'message'  => 'Mobile phone number verified successfully.',
        ]);
    }
}
