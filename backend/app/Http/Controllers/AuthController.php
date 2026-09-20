<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required'
        ]);

        $loginInput = trim($request->email);

        // Case-insensitive user lookup by primary email or email_address
        $user = \App\Models\User::where(function ($query) use ($loginInput) {
            $lower = strtolower($loginInput);
            $query->whereRaw('LOWER(email_address) = ?', [$lower])
                  ->orWhereRaw('LOWER(email) = ?', [$lower]);
        })->first();

        if (!$user || !\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
            $cacheKey = 'failed_login_' . md5($loginInput . '_' . $request->ip());
            $attempts = (int)\Illuminate\Support\Facades\Cache::get($cacheKey, 0) + 1;
            \Illuminate\Support\Facades\Cache::put($cacheKey, $attempts, now()->addMinutes(15));

            $userAgent = $request->header('User-Agent') ?: 'Web Browser';
            $ip = $request->ip() ?: '127.0.0.1';
            $deviceName = self::parseDeviceSummary($userAgent);

            try {
                \App\Models\SecurityAlert::create([
                    'event_type'  => $attempts >= 5 ? 'login_lockout' : 'failed_login',
                    'severity'    => $attempts >= 5 ? 'critical' : ($attempts >= 3 ? 'high' : 'medium'),
                    'title'       => "Failed login attempt for '{$loginInput}' (Attempt {$attempts}/5)",
                    'description' => "Unsuccessful authentication attempt using identifier '{$loginInput}' from origin {$ip}.",
                    'ip_address'  => $ip,
                    'user_agent'  => $userAgent,
                    'metadata'    => [
                        'origin'        => "{$ip} ({$deviceName})",
                        'username'      => $loginInput,
                        'attempt'       => $attempts,
                        'max_attempts'  => 5,
                        'device'        => $deviceName,
                    ],
                    'status'      => 'unresolved',
                ]);
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::error("Failed to log dynamic SecurityAlert: " . $t->getMessage());
            }

            throw ValidationException::withMessages([
                'email' => ['Invalid email or password. Please verify your credentials.'],
            ]);
        }

        if ($user->status === 'pending_activation') {
            return response()->json([
                'message' => 'Your account is pending activation. Please check your email for the invitation link.'
            ], 403);
        }

        if (is_null($user->email_verified_at) && !$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Your email address has not been verified. Please check your inbox or ask your administrator to resend the invitation.'
            ], 403);
        }

        if ($user->status === 'inactive' || $user->status === 'disabled' || $user->is_active === false || !is_null($user->archived_at)) {
            return response()->json([
                'message' => 'This account is currently deactivated or disabled. Please contact the system administrator.'
            ], 403);
        }

        // Reset failed attempt counter on successful login
        \Illuminate\Support\Facades\Cache::forget('failed_login_' . md5($loginInput . '_' . $request->ip()));

        Auth::login($user);
        $user->load(['role']);

        // Delete old tokens to keep things clean for SPA
        $user->tokens()->delete();

        $userAgent = $request->header('User-Agent') ?: 'Web Browser';
        $ip = $request->ip() ?: '127.0.0.1';
        $deviceName = self::parseDeviceSummary($userAgent);

        $tokenResult = $user->createToken('staff-auth-token');
        $tokenResult->accessToken->update([
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'device_name' => $deviceName,
            'is_revoked' => false,
        ]);

        $token = $tokenResult->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    /**
     * Parse human-readable device/browser summary from User-Agent.
     */
    public static function parseDeviceSummary(?string $ua): string
    {
        if (empty($ua)) return 'Web Terminal';

        $browser = 'Browser';
        if (preg_match('/Edg\/([\d\.]+)/i', $ua, $m)) {
            $browser = 'Edge ' . explode('.', $m[1])[0];
        } elseif (preg_match('/Chrome\/([\d\.]+)/i', $ua, $m)) {
            $browser = 'Chrome ' . explode('.', $m[1])[0];
        } elseif (preg_match('/Firefox\/([\d\.]+)/i', $ua, $m)) {
            $browser = 'Firefox ' . explode('.', $m[1])[0];
        } elseif (str_contains($ua, 'Safari/') && !str_contains($ua, 'Chrome')) {
            $browser = 'Safari';
        }

        $os = 'Desktop';
        if (str_contains($ua, 'Windows NT 10.0') || str_contains($ua, 'Windows NT 11.0')) {
            $os = 'Windows 10/11';
        } elseif (str_contains($ua, 'Windows')) {
            $os = 'Windows';
        } elseif (str_contains($ua, 'Macintosh') || str_contains($ua, 'Mac OS')) {
            $os = 'macOS';
        } elseif (str_contains($ua, 'Linux')) {
            $os = 'Linux';
        } elseif (str_contains($ua, 'Android')) {
            $os = 'Android';
        } elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) {
            $os = 'iOS';
        }

        return "{$browser} on {$os}";
    }

    /**
     * Fetch invitation details by token for account setup screen.
     */
    public function getInviteDetails(string $token)
    {
        $user = \App\Models\User::where('invite_token', $token)->with(['role'])->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired activation link.'], 404);
        }

        return response()->json([
            'email'         => $user->email_address ?: $user->email,
            'email_address' => $user->email_address ?: $user->email,
            'office'        => $user->location ?? 'FSUU Main Campus',
            'role'          => $user->role ? ucfirst($user->role->name) : 'Staff',
            'permissions'   => $user->permissions ?? [],
            'status'        => $user->status,
        ]);
    }

    /**
     * Complete activation setup for invited account.
     */
    public function activateAccount(Request $request)
    {
        $validated = $request->validate([
            'token'       => 'required|string',
            'first_name'  => 'nullable|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name'   => 'nullable|string|max:255',
            'suffix'      => 'nullable|string|max:50',
            'name'        => 'nullable|string|max:255',
            'password'    => 'required|string|min:6',
        ]);

        $user = \App\Models\User::where('invite_token', $validated['token'])->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired activation token.'], 404);
        }

        $firstName  = $validated['first_name'] ?? null;
        $middleName = $validated['middle_name'] ?? null;
        $lastName   = $validated['last_name'] ?? null;
        $suffix     = $validated['suffix'] ?? null;

        if (empty($firstName) && !empty($validated['name'])) {
            $parts = explode(' ', trim($validated['name']));
            $firstName = array_shift($parts) ?: $validated['name'];
            $lastName = !empty($parts) ? implode(' ', $parts) : '';
        }

        $fullName = trim(implode(' ', array_filter([$firstName, $middleName, $lastName, $suffix])));
        if (empty($fullName)) {
            $fullName = $validated['name'] ?? 'User';
        }

        $user->first_name   = $firstName;
        $user->middle_name  = $middleName;
        $user->last_name    = $lastName;
        $user->suffix       = $suffix;
        $user->name         = $fullName;
        $user->password     = \Illuminate\Support\Facades\Hash::make($validated['password']);
        $user->email_verified_at = now();
        $user->status       = 'active';
        $user->is_active    = true;
        $user->invite_token = null;
        $user->save();

        try {
            app(\App\Services\AuditLogService::class)->log(
                $user,
                'USER_ACTIVATED',
                'users',
                $user->id,
                ['name' => $fullName, 'email' => $user->email_address ?: $user->email, 'role' => $user->role?->name]
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Account activated successfully! You may now sign in.',
            'user'    => $user->load(['role']),
        ]);
    }

    /**
     * Terminate the user's active session and revoke the current Sanctum token.
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $currentToken = $user->currentAccessToken();
            if ($currentToken) {
                $currentToken->update([
                    'is_revoked' => true,
                    'revoked_at' => now(),
                ]);
                $currentToken->delete();
            } else {
                $user->tokens()->delete();
            }

            try {
                \App\Models\AuditLog::create([
                    'user_id'        => $user->id,
                    'action'         => 'USER_LOGOUT',
                    'auditable_type' => 'users',
                    'auditable_id'   => $user->id,
                    'ip_address'     => $request->ip(),
                    'metadata'       => [
                        'description' => "User '{$user->name}' logged out.",
                        'user_agent'  => $request->userAgent(),
                    ],
                ]);
            } catch (\Throwable $e) {}
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load(['role']));
    }

    public function checkEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $exists = \App\Models\User::where('email_address', $request->email)
            ->orWhere('email', $request->email)
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8|confirmed'
        ]);

        $user = auth()->user();

        if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided current password does not match our records.']
            ]);
        }

        $user->password = \Illuminate\Support\Facades\Hash::make($request->new_password);
        $user->save();

        try {
            app(\App\Services\AuditLogService::class)->log(
                $user,
                'PASSWORD_CHANGED',
                'users',
                $user->id,
                [
                    'description' => "User '{$user->name}' updated their account password.",
                    'email'       => $user->email_address ?? $user->email,
                ]
            );
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function getPermissions(Request $request)
    {
        $user = auth()->user();
        return response()->json([
            'is_superadmin' => $user->isSuperAdmin(),
            'permissions' => $user->permissions ?? []
        ]);
    }

    public function verifyPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = auth()->user();

        if (!\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
            return response()->json([
                'valid'   => false,
                'message' => 'Incorrect password. Please try again.',
            ], 422);
        }

        return response()->json([
            'valid'   => true,
            'message' => 'Password verified.',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'first_name'     => 'nullable|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'nullable|string|max:255',
            'suffix'         => 'nullable|string|max:50',
            'email_address'  => ['sometimes', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email_address')->ignore($user->id)],
            'email'          => ['sometimes', 'email', 'max:255'],
            'avatar'         => 'nullable|string',
        ]);

        if (array_key_exists('first_name', $validated)) $user->first_name = $validated['first_name'];
        if (array_key_exists('middle_name', $validated)) $user->middle_name = $validated['middle_name'];
        if (array_key_exists('last_name', $validated)) $user->last_name = $validated['last_name'];
        if (array_key_exists('suffix', $validated)) $user->suffix = $validated['suffix'];

        if (isset($validated['name'])) {
            $trimmedName = trim($validated['name']);
            $user->name = $trimmedName;
            if (!isset($validated['first_name']) && !isset($validated['last_name'])) {
                $parts = preg_split('/\s+/', $trimmedName);
                $user->first_name = array_shift($parts) ?: $trimmedName;
                $user->middle_name = null;
                $user->suffix = null;
                $user->last_name = !empty($parts) ? implode(' ', $parts) : '';
            }
        }
        $newEmail = $validated['email_address'] ?? $validated['email'] ?? null;
        if ($newEmail) {
            $user->email_address = $newEmail;
            $user->email = $newEmail;
        }
        
        if (array_key_exists('avatar', $validated)) {
            $user->avatar = app(\App\Services\MediaUploadService::class)->upload($validated['avatar'], 'avatars');
        }

        if ($request->hasFile('image')) {
            $user->avatar = app(\App\Services\MediaUploadService::class)->upload($request->file('image'), 'avatars');
        }

        $user->save();
        $user->load(['role']);

        return response()->json([
            'message' => 'Profile updated successfully!',
            'user'    => $user,
        ]);
    }

    /**
     * Handle browser exit beacon (sendBeacon on tab/window close).
     * Revokes the token even after the user has navigated away or closed the browser.
     */
    public function logoutBeacon(Request $request)
    {
        // Token can arrive via JSON payload, raw input, or Authorization Bearer header
        $rawPayload = $request->getContent();
        $plainToken = null;
        if (!empty($rawPayload)) {
            $json = json_decode($rawPayload, true);
            if (is_array($json) && !empty($json['token'])) {
                $plainToken = $json['token'];
            }
        }
        if (!$plainToken) {
            $plainToken = $request->input('token') ?: $request->bearerToken();
        }

        if ($plainToken) {
            $token = \Laravel\Sanctum\PersonalAccessToken::findToken($plainToken);
            if ($token) {
                $user = $token->tokenable;
                $token->update([
                    'is_revoked' => true,
                    'revoked_at' => now(),
                ]);
                $token->delete();

                if ($user) {
                    try {
                        \App\Models\AuditLog::create([
                            'user_id'        => $user->id,
                            'action'         => 'USER_LOGOUT_BEACON',
                            'auditable_type' => 'users',
                            'auditable_id'   => $user->id,
                            'ip_address'     => $request->ip(),
                            'metadata'       => [
                                'description' => "User '{$user->name}' closed browser window/tab (Exit Beacon).",
                                'user_agent'  => $request->userAgent(),
                            ],
                        ]);
                    } catch (\Throwable $e) {}
                }
            }
        }

        return response()->json(['message' => 'Exit beacon processed']);
    }

    /**
     * Handle Forgot Password request.
     * Generates a single-use 6-digit OTP code and cryptographic reset token,
     * stores their SHA-256 hashes, dispatches notification, and returns a uniform response.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($request->email));
        $cooldownKey = 'pwd_reset_cooldown_' . hash('sha256', $email);

        if (\Illuminate\Support\Facades\Cache::has($cooldownKey)) {
            $remaining = \Illuminate\Support\Facades\Cache::get($cooldownKey) - time();
            if ($remaining > 0) {
                return response()->json([
                    'message'            => "Please wait {$remaining} seconds before requesting a new password reset code.",
                    'cooldown_remaining' => $remaining,
                ], 429);
            }
        }

        // Find user by primary email or email_address
        $user = \App\Models\User::where(function ($q) use ($email) {
            $q->whereRaw('LOWER(email_address) = ?', [$email])
              ->orWhereRaw('LOWER(email) = ?', [$email]);
        })->first();

        if ($user && ($user->is_active ?? true) && ($user->status !== 'inactive' && $user->status !== 'suspended')) {
            // Delete any existing unused password reset tokens for this email
            \App\Models\PasswordResetToken::where('email', $email)->whereNull('used_at')->delete();

            // Generate cryptographically random OTP (6 digits) and 64-character token
            $plainOtp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $plainToken = bin2hex(random_bytes(32));

            \App\Models\PasswordResetToken::create([
                'email'       => $email,
                'token_hash'  => hash('sha256', $plainToken),
                'otp_hash'    => hash('sha256', $plainOtp),
                'attempts'    => 0,
                'expires_at'  => now()->addMinutes(10),
                'ip_address'  => $request->ip(),
                'user_agent'  => $request->userAgent(),
            ]);

            // Set 60s cooldown
            \Illuminate\Support\Facades\Cache::put($cooldownKey, time() + 60, 60);

            // Dispatch async email job with both 6-digit OTP and direct link
            \App\Jobs\SendPasswordResetEmailJob::dispatch($email, $user->name, $plainOtp, $plainToken);

            try {
                \App\Models\AuditLog::create([
                    'user_id'        => $user->id,
                    'action'         => 'PASSWORD_RESET_REQUESTED',
                    'auditable_type' => 'users',
                    'auditable_id'   => $user->id,
                    'ip_address'     => $request->ip(),
                    'metadata'       => [
                        'description' => "Password reset requested for {$user->name} ({$email})",
                        'user_agent'  => $request->userAgent(),
                    ],
                ]);
            } catch (\Throwable $e) {}
        } else {
            // Still enforce cooldown to prevent timing attacks / email discovery
            \Illuminate\Support\Facades\Cache::put($cooldownKey, time() + 60, 60);
        }

        // Anti-enumeration: return uniform response regardless of account existence
        return response()->json([
            'message'    => 'If that email address is registered with an active staff account, you will receive a verification code and reset link shortly.',
            'expires_in' => 600,
            'cooldown'   => 60,
        ]);
    }

    /**
     * Verify the 6-digit OTP code submitted on the Forgot Password screen.
     * Enforces a maximum of 5 attempts before locking the request.
     */
    public function verifyResetCode(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'code'  => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($request->email));
        $code  = trim($request->code);

        $record = \App\Models\PasswordResetToken::where('email', $email)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (!$record || $record->isExpired()) {
            return response()->json([
                'message' => 'The verification code has expired or was not requested. Please request a new code.',
            ], 422);
        }

        if ($record->attempts >= 5) {
            $record->delete();
            return response()->json([
                'message' => 'Maximum verification attempts exceeded. For your security, this reset request has been locked. Please request a new code.',
            ], 422);
        }

        $submittedHash = hash('sha256', $code);
        if ($record->otp_hash !== $submittedHash) {
            $record->recordFailedAttempt();
            $remaining = 5 - $record->attempts;
            return response()->json([
                'message' => "Incorrect verification code. {$remaining} attempts remaining before request is locked.",
            ], 422);
        }

        // OTP verified successfully: generate a fresh exchange token for Step 3
        $exchangeToken = bin2hex(random_bytes(32));
        $record->update([
            'token_hash' => hash('sha256', $exchangeToken),
            'otp_hash'   => 'VERIFIED',
        ]);

        return response()->json([
            'verified'    => true,
            'reset_token' => $exchangeToken,
            'message'     => 'Verification code confirmed. You may now enter your new password.',
        ]);
    }

    /**
     * Finalize Password Reset with new password.
     * Revokes all previous Sanctum tokens/sessions across all devices for security.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => ['required', 'string', 'email'],
            'token'                 => ['required', 'string', 'min:32'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim($request->email));
        $token = trim($request->token);
        $tokenHash = hash('sha256', $token);

        $record = \App\Models\PasswordResetToken::where('email', $email)
            ->where('token_hash', $tokenHash)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (!$record || $record->isExpired()) {
            return response()->json([
                'message' => 'Invalid or expired password reset token. Please request a new reset link.',
            ], 422);
        }

        $user = \App\Models\User::where(function ($q) use ($email) {
            $q->whereRaw('LOWER(email_address) = ?', [$email])
              ->orWhereRaw('LOWER(email) = ?', [$email]);
        })->first();

        if (!$user) {
            return response()->json([
                'message' => 'Unable to locate an active account for this reset request.',
            ], 422);
        }

        // Update password with bcrypt/Argon2
        $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
        $user->save();

        // Mark token consumed
        $record->update([
            'used_at' => now(),
        ]);

        // Security Kill Switch: Revoke all existing active Sanctum tokens across all devices
        $user->tokens()->delete();

        // Log security audit
        try {
            \App\Models\AuditLog::create([
                'user_id'        => $user->id,
                'action'         => 'PASSWORD_RESET_SUCCESS',
                'auditable_type' => 'users',
                'auditable_id'   => $user->id,
                'ip_address'     => $request->ip(),
                'metadata'       => [
                    'description' => "Password successfully reset for {$user->name} ({$email})",
                    'user_agent'  => $request->userAgent(),
                ],
            ]);
        } catch (\Throwable $e) {}

        // Dispatch security alert email to user
        \App\Jobs\SendPasswordChangedEmailJob::dispatch(
            $user->email_address ?: $user->email,
            $user->name,
            $request->ip(),
            self::parseDeviceSummary($request->userAgent())
        );

        return response()->json([
            'message' => 'Password reset successfully! You may now sign in with your new password.',
        ]);
    }
}

