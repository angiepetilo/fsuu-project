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

        if (!Auth::attempt($request->only('email', 'password'))) {
            $userByPersonal = \App\Models\User::where('personal_email', $request->email)->first();
            if ($userByPersonal && \Illuminate\Support\Facades\Hash::check($request->password, $userByPersonal->password)) {
                Auth::login($userByPersonal);
            } else {
                throw ValidationException::withMessages([
                    'email' => ['Invalid credentials.'],
                ]);
            }
        }

        $user = auth()->user()->load('office');

        // Delete old tokens to keep things clean for our SPA
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
