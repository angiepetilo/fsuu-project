<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Rules\ActiveDeliverableEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmailVerificationController extends Controller
{
    /**
     * Check if an email has valid RFC syntax, is not disposable, and has active DNS MX records.
     */
    public function verifyActive(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email', ''));

        if (empty($email)) {
            return response()->json([
                'valid'   => false,
                'message' => 'Email address is required.'
            ], 422);
        }

        $validator = Validator::make(
            ['email' => $email],
            ['email' => ['required', 'email', new ActiveDeliverableEmail]]
        );

        if ($validator->fails()) {
            return response()->json([
                'valid'   => false,
                'email'   => $email,
                'message' => $validator->errors()->first('email')
            ], 422);
        }

        $parts = explode('@', $email);
        $domain = strtolower($parts[1] ?? '');

        return response()->json([
            'valid'   => true,
            'email'   => $email,
            'domain'  => $domain,
            'message' => "Email domain @{$domain} is active and deliverable."
        ], 200);
    }
}
