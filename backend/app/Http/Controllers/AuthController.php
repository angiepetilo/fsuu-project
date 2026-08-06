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

        $loginInput = $request->email;
        $fieldType = filter_var($loginInput, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        if (!Auth::attempt([$fieldType => $loginInput, 'password' => $request->password])) {
            // Secondary attempt checking username if email was provided or vice-versa
            if (!Auth::attempt([$fieldType === 'email' ? 'username' : 'email' => $loginInput, 'password' => $request->password])) {
                throw ValidationException::withMessages([
                    'email' => ['Invalid credentials.'],
                ]);
            }
        }

        $user = auth()->user()->load(['office', 'role']);

        // Delete old tokens to keep things clean for SPA
        $user->tokens()->delete();

        $token = $user->createToken('staff-auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
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
            $user->avatar = $this->saveBase64Image($validated['avatar'], 'avatars');
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('avatars', 'public');
            $user->avatar = Storage::url($path);
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
