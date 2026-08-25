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

        // Case-insensitive user lookup by primary email or personal email
        $user = \App\Models\User::where(function ($query) use ($loginInput) {
            $lower = strtolower($loginInput);
            $query->whereRaw('LOWER(email) = ?', [$lower])
                  ->orWhereRaw('LOWER(personal_email) = ?', [$lower]);
        })->first();

        if (!$user || !\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password. Please verify your credentials.'],
            ]);
        }

        if ($user->status === 'pending_activation') {
            return response()->json([
                'message' => 'Your account is pending activation. Please check your email for the invitation link.'
            ], 403);
        }

        if ($user->status === 'inactive' || $user->status === 'disabled' || $user->is_active === false || !is_null($user->archived_at)) {
            return response()->json([
                'message' => 'This account is currently deactivated or disabled. Please contact the system administrator.'
            ], 403);
        }

        Auth::login($user);
        $user->load(['role']);

        // Delete old tokens to keep things clean for SPA
        $user->tokens()->delete();

        $token = $user->createToken('staff-auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
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
            'email'       => $user->personal_email ?? $user->email,
            'office'      => $user->location ?? 'FSUU Main Campus',
            'role'        => $user->role ? ucfirst($user->role->name) : 'Staff',
            'permissions' => $user->permissions ?? [],
            'status'      => $user->status,
        ]);
    }

    /**
     * Complete activation setup for invited account.
     */
    public function activateAccount(Request $request)
    {
        $validated = $request->validate([
            'token'    => 'required|string',
            'name'     => 'required|string|max:255',
            'password' => 'required|string|min:6',
        ]);

        $user = \App\Models\User::where('invite_token', $validated['token'])->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired activation token.'], 404);
        }

        $user->name = trim($validated['name']);
        $user->password = \Illuminate\Support\Facades\Hash::make($validated['password']);
        $user->status = 'active';
        $user->is_active = true;
        $user->invite_token = null;
        $user->save();

        return response()->json([
            'message' => 'Account activated successfully! You may now sign in.',
            'user'    => $user->load(['role']),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6',
        ]);

        $user = auth()->user();

        if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided current password does not match our records.'],
            ]);
        }

        $user->password = \Illuminate\Support\Facades\Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password updated successfully!']);
    }

    /**
     * Verify the authenticated user's current password.
     * Used for sensitive settings access confirmation.
     */
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
            'email'          => ['sometimes', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users')->ignore($user->id)],
            'personal_email' => 'nullable|email|max:255',
            'avatar'         => 'nullable|string',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (isset($validated['personal_email'])) $user->personal_email = $validated['personal_email'];
        
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
}
