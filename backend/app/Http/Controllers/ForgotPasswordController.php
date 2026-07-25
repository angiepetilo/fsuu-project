<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class ForgotPasswordController extends Controller
{
    /**
     * Step 1: Send a 6-digit OTP to the user's personal_email.
     * The user enters their login email/username; we find their personal_email.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string', // username (email column) or personal_email
        ]);

        $login = trim($request->login);

        // Find user by login username OR personal_email
        $user = User::where('email', $login)
            ->orWhere('personal_email', $login)
            ->first();

        // Always return success (don't reveal if account exists)
        if (! $user || ! $user->personal_email) {
            return response()->json([
                'message' => 'If an account with that email exists, a reset code was sent to the registered personal email.',
            ]);
        }

        // Generate 6-digit OTP, store in cache for 10 minutes
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $cacheKey = 'pwd_reset_otp_' . $user->id;
        Cache::put($cacheKey, $otp, now()->addMinutes(10));

        // Send email
        try {
            Mail::raw(
                "Your FSUU password reset code is: {$otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.",
                function ($msg) use ($user) {
                    $msg->to($user->personal_email)
                        ->subject('FSUU System — Password Reset Code');
                }
            );
        } catch (\Throwable $e) {
            // If email fails, still return success but log the error
            \Log::error('Password reset email failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'If an account with that email exists, a reset code was sent to the registered personal email.',
            // For dev: expose masked email hint
            'hint'    => $this->maskEmail($user->personal_email),
        ]);
    }

    /**
     * Step 2: Verify the OTP code.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'otp'   => 'required|string|size:6',
        ]);

        $user = User::where('email', $request->login)
            ->orWhere('personal_email', $request->login)
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Invalid code.'], 422);
        }

        $cacheKey = 'pwd_reset_otp_' . $user->id;
        $stored   = Cache::get($cacheKey);

        if (! $stored || $stored !== $request->otp) {
            return response()->json(['message' => 'The code is incorrect or has expired.'], 422);
        }

        // Issue a short-lived reset token (valid for 15 minutes)
        $resetToken = Str::random(64);
        Cache::put('pwd_reset_token_' . $user->id, $resetToken, now()->addMinutes(15));

        return response()->json([
            'message'      => 'Code verified.',
            'reset_token'  => $resetToken,
            'user_id'      => $user->id,
        ]);
    }

    /**
     * Step 3: Set the new password using the reset token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'user_id'      => 'required|integer|exists:users,id',
            'reset_token'  => 'required|string',
            'password'     => 'required|string|min:8|confirmed',
        ]);

        $user = User::findOrFail($request->user_id);

        $cacheKey = 'pwd_reset_token_' . $user->id;
        $stored   = Cache::get($cacheKey);

        if (! $stored || $stored !== $request->reset_token) {
            return response()->json(['message' => 'Reset session expired. Please start over.'], 422);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Invalidate all tokens
        $user->tokens()->delete();
        Cache::forget($cacheKey);
        Cache::forget('pwd_reset_otp_' . $user->id);

        return response()->json(['message' => 'Password updated successfully. You can now sign in.']);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $masked = substr($local, 0, 2) . str_repeat('*', max(0, strlen($local) - 2));
        return $masked . '@' . $domain;
    }
}
