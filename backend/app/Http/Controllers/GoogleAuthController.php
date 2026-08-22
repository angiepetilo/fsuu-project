<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

/**
 * Google OAuth flow (Socialite + Sanctum):
 *
 *   1. Frontend calls GET /api/auth/google/redirect
 *      → Returns the Google authorization URL as JSON.
 *      → Frontend redirects the browser there.
 *
 *   2. Google redirects back to GET /api/auth/google/callback?code=...
 *      → Socialite exchanges code for the Google user profile.
 *      → We find or create the local User record.
 *      → Sanctum issues a token, returned as JSON.
 *      → Frontend stores the token and redirects to /dashboard.
 *
 * Security notes:
 *   - Only users whose email already has a record in the `users` table
 *     (seeded by Admin) are allowed in. Unknown Google accounts receive 403.
 *   - Admin creates Staff accounts first (with the correct email + office_id + role),
 *     THEN Staff can log in via Google. Self-registration is not possible.
 *   - `google_id` is stored on first successful login for faster future lookups.
 */
class GoogleAuthController extends Controller
{
    /**
     * Step 1 — return the Google OAuth authorization URL.
     * Frontend will redirect the browser to this URL.
     */
    public function redirect(): JsonResponse
    {
        $clientId = config('services.google.client_id');
        if (empty($clientId)) {
            return response()->json([
                'message' => 'Google OAuth is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your Render environment variables, or use email and password to log in.'
            ], 422);
        }

        $url = Socialite::driver('google')
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Step 2 — Google redirects back here with ?code=...
     * Exchange code → Google user profile → find/update local User → issue Sanctum token.
     */
    public function callback(Request $request)
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $isBrowserRedirect = !$request->wantsJson() && !$request->ajax();

        $googleUser = null;
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Google OAuth callback failed: ' . $e->getMessage());

            // Local development fallback if Google credentials or auth code is invalid
            if (config('app.env') === 'local' || app()->environment('local')) {
                $user = User::first();
                if ($user) {
                    $token = $user->createToken('google-auth-dev-token')->plainTextToken;
                    $roleName = $user->role?->name ?? ($user->role_id === 1 ? 'superadmin' : 'admin');

                    if ($isBrowserRedirect) {
                        $queryParams = http_build_query([
                            'token'          => $token,
                            'role'           => $roleName,
                            'email'          => $user->email,
                            'name'           => $user->name,
                            'personal_email' => $user->personal_email ?? '',
                            'avatar'         => $user->avatar ?? '',
                            'office_id'      => $user->office_id ?? '',
                        ]);
                        return redirect("{$frontendUrl}/auth/google/callback?{$queryParams}");
                    }

                    return response()->json([
                        'token' => $token,
                        'user'  => [
                            'id'        => $user->id,
                            'name'      => $user->name,
                            'email'     => $user->email,
                            'avatar'    => $user->avatar,
                            'role'      => $user->role,
                            'office_id' => $user->office_id,
                            'office'    => $user->location ?? 'FSUU Main Campus',
                        ],
                        'dev_notice' => 'Authenticated via local development fallback account.',
                    ]);
                }
            }

            if ($isBrowserRedirect) {
                return redirect("{$frontendUrl}/login?error=" . urlencode('Google authentication failed or session code expired.'));
            }

            return response()->json([
                'message' => 'Google authentication failed or session code expired: ' . $e->getMessage(),
            ], 401);
        }

        // Prefer lookup by google_id (stable, never changes), fall back to email or personal_email
        $googleEmail = $googleUser->getEmail();
        $user = User::where('google_id', $googleUser->getId())->first()
            ?? User::where('email', $googleEmail)->first()
            ?? User::where('personal_email', $googleEmail)->first();

        // Only pre-created accounts are allowed. No self-registration.
        if (! $user) {
            if ($isBrowserRedirect) {
                return redirect("{$frontendUrl}/login?error=" . urlencode('No account exists for this Google address. Contact your office Admin.'));
            }

            return response()->json([
                'message' => 'No account exists for this Google address. Contact your office Admin.',
            ], 403);
        }

        // Must activate account via invitation email before signing in with Google
        if ($user->status === 'pending_activation' || !empty($user->invite_token)) {
            $activationMsg = 'Please activate your account using the invitation link sent to your email first before signing in with Google.';
            if ($isBrowserRedirect) {
                return redirect("{$frontendUrl}/login?error=" . urlencode($activationMsg));
            }

            return response()->json([
                'message' => $activationMsg,
            ], 403);
        }

        // Persist google_id and avatar on login
        $user->update([
            'google_id' => $googleUser->getId(),
            'avatar'    => $googleUser->getAvatar(),
        ]);

        // Revoke previous tokens — one active session per user
        $user->tokens()->delete();

        $token = $user->createToken('google-auth-token')->plainTextToken;
        $roleName = $user->role?->name ?? ($user->role_id === 1 ? 'superadmin' : 'admin');

        if ($isBrowserRedirect) {
            $queryParams = http_build_query([
                'token'          => $token,
                'role'           => $roleName,
                'email'          => $user->email,
                'name'           => $user->name,
                'personal_email' => $user->personal_email ?? '',
                'avatar'         => $user->avatar ?? '',
                'office_id'      => $user->office_id ?? '',
            ]);
            return redirect("{$frontendUrl}/auth/google/callback?{$queryParams}");
        }

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'avatar'    => $user->avatar,
                'role'      => $user->role,
                'office_id' => $user->office_id,
                'office'    => $user->load('office')->office?->only(['id', 'name', 'code', 'type']),
            ],
        ]);
    }
}

