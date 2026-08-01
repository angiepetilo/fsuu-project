<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
}
