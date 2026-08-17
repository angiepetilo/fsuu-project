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

        if (!Auth::attempt(['email' => $loginInput, 'password' => $request->password])) {
            // Secondary attempt checking personal_email
            if (!Auth::attempt(['personal_email' => $loginInput, 'password' => $request->password])) {
                throw ValidationException::withMessages([
                    'email' => ['Invalid credentials.'],
                ]);
            }
        }

        $user = auth()->user()->load(['office', 'role']);

        if ($user->status === 'pending_activation') {
            Auth::logout();
            return response()->json([
                'message' => 'Please check your email to activate your account.'
            ], 403);
        }

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
        $user = \App\Models\User::where('invite_token', $token)->with(['office', 'role'])->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired activation link.'], 404);
        }

        return response()->json([
            'email'       => $user->personal_email ?? $user->email,
            'office'      => $user->office ? ($user->office->location ? $user->office->name . ' | ' . $user->office->location : $user->office->name) : 'FSUU Main Campus',
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
            'user'    => $user->load(['office', 'role']),
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
        $user->load(['office', 'role']);

        return response()->json([
            'message' => 'Profile updated successfully!',
            'user'    => $user,
        ]);
    }

    private function saveBase64Image(?string $base64Data, string $folder = 'avatars'): ?string
    {
        if (!$base64Data) {
            return null;
        }

        if (str_starts_with($base64Data, '/storage/')) {
            return url($base64Data);
        }

        if (!str_contains($base64Data, ';base64,')) {
            return $base64Data;
        }

        try {
            @list($type, $fileData) = explode(';', $base64Data);
            @list(, $fileData)      = explode(',', $fileData);

            $mimeType = str_replace('data:', '', $type);
            $extension = match ($mimeType) {
                'image/png'  => 'png',
                'image/gif'  => 'gif',
                'image/webp' => 'webp',
                default      => 'jpg',
            };

            $fileName = $folder . '_' . time() . '_' . Str::random(8) . '.' . $extension;
            $filePath = $folder . '/' . $fileName;

            Storage::disk('public')->put($filePath, base64_decode($fileData));

            return url(Storage::url($filePath));
        } catch (\Throwable $e) {
            return $base64Data;
        }
    }
}
