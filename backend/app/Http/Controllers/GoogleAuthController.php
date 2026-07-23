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
    public function callback(Request $request): JsonResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Google authentication failed.'], 401);
        }

        // Prefer lookup by google_id (stable, never changes), fall back to email
        $user = User::where('google_id', $googleUser->getId())->first()
            ?? User::where('email', $googleUser->getEmail())->first();

        // Only pre-created accounts are allowed. No self-registration.
        if (! $user) {
            return response()->json([
                'message' => 'No account exists for this Google address. Contact your office Admin.',
            ], 403);
        }

        // Persist google_id and avatar on first login (or if they've changed)
        $user->update([
            'google_id' => $googleUser->getId(),
            'avatar'    => $googleUser->getAvatar(),
        ]);

        // Revoke previous tokens — one active session per user
        $user->tokens()->delete();

        $token = $user->createToken('google-auth-token')->plainTextToken;

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
