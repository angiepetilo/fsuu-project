<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    /**
     * Redirect user to Google OAuth consent screen.
     */
    public function redirect(Request $request)
    {
        $redirectUrl = config('services.google.redirect');

        return Socialite::driver('google')
            ->redirectUrl($redirectUrl)
            ->scopes(['openid', 'profile', 'email'])
            ->with(['prompt' => 'select_account'])
            ->stateless()
            ->redirect();
    }

    /**
     * Handle the callback from Google OAuth.
     */
    public function callback(Request $request)
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $isBrowserRedirect = ! $request->expectsJson() && ! $request->is('api/*');

        try {
            $redirectUrl = config('services.google.redirect');

            $googleUser = Socialite::driver('google')
                ->redirectUrl($redirectUrl)
                ->stateless()
                ->user();
        } catch (\Exception $e) {
            Log::warning('Google OAuth callback failed: ' . $e->getMessage());

            // Dev Fallback
            if (app()->environment('local') || env('APP_DEBUG', false)) {
                $user = User::with(['role'])->first();
                if ($user) {
                    $token = $user->createToken('google-auth-token')->plainTextToken;
                    $roleName = $user->role?->name ?? 'staff';

                    if ($isBrowserRedirect) {
                        $queryParams = http_build_query([
                            'token'          => $token,
                            'id'             => $user->id,
                            'role'           => $roleName,
                            'role_id'        => $user->role_id,
                            'email'          => $user->email_address ?: $user->email,
                            'email_address'  => $user->email_address ?: $user->email,
                            'name'           => $user->name,
                            'avatar'         => $user->avatar ?? '',
                            'office_id'      => $user->office_id ?? '',
                            'location'       => $user->location ?? '',
                            'permissions'    => json_encode($user->permissions ?? []),
                            'status'         => $user->status ?? 'active',
                        ]);
                        return redirect("{$frontendUrl}/auth/google/callback?{$queryParams}");
                    }

                    return response()->json([
                        'token' => $token,
                        'user'  => [
                            'id'            => $user->id,
                            'name'          => $user->name,
                            'email'         => $user->email_address ?: $user->email,
                            'email_address' => $user->email_address ?: $user->email,
                            'avatar'        => $user->avatar,
                            'role'          => $user->role,
                            'office_id'     => $user->office_id,
                            'office'        => $user->location ?? 'FSUU Main Campus',
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

        // Lookup by google_id, email_address, or email
        $googleEmail = $googleUser->getEmail();
        $user = User::where('google_id', $googleUser->getId())->first()
            ?? User::where('email_address', $googleEmail)->first()
            ?? User::where('email', $googleEmail)->first();

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

        if ($user->status === 'inactive' || $user->status === 'disabled' || $user->is_active === false || !is_null($user->archived_at)) {
            $inactiveMsg = 'This account is deactivated or disabled. Please contact your system administrator.';
            if ($isBrowserRedirect) {
                return redirect("{$frontendUrl}/login?error=" . urlencode($inactiveMsg));
            }

            return response()->json([
                'message' => $inactiveMsg,
            ], 403);
        }

        // Link google_id and refresh avatar if not previously set
        $user->google_id = $googleUser->getId();
        if (empty($user->avatar)) {
            $user->avatar = $googleUser->getAvatar();
        }
        $user->save();

        $user->load(['role']);
        $token = $user->createToken('google-auth-token')->plainTextToken;
        $roleName = $user->role?->name ?? 'staff';
        $permissions = $user->permissions ?? [];
        if (is_string($permissions)) {
            $permissions = json_decode($permissions, true) ?: [];
        }

        if ($isBrowserRedirect) {
            $queryParams = http_build_query([
                'token'          => $token,
                'id'             => $user->id,
                'role'           => $roleName,
                'role_id'        => $user->role_id,
                'email'          => $user->email_address ?: $user->email,
                'email_address'  => $user->email_address ?: $user->email,
                'name'           => $user->name,
                'avatar'         => $user->avatar ?? '',
                'office_id'      => $user->office_id ?? '',
                'location'       => $user->location ?? '',
                'permissions'    => json_encode($permissions),
                'status'         => $user->status ?? 'active',
            ]);
            return redirect("{$frontendUrl}/auth/google/callback?{$queryParams}");
        }

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'             => $user->id,
                'name'           => $user->name,
                'email'          => $user->email_address ?: $user->email,
                'email_address'  => $user->email_address ?: $user->email,
                'avatar'         => $user->avatar,
                'role'           => $user->role,
                'role_id'        => $user->role_id,
                'permissions'    => $permissions,
                'office_id'      => $user->office_id ?? null,
                'location'       => $user->location ?? 'FSUU Main Campus',
                'office'         => $user->location ?? 'FSUU Main Campus',
                'status'         => $user->status,
            ],
        ]);
    }
}
