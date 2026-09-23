<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Services\AbstractEmailValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Check if an email has valid RFC syntax, is not in the 75,000+ disposable domain blacklist,
     * has active DNS MX records, and passes Abstract API mailbox deliverability.
     */
    public function verifyActive(Request $request, AbstractEmailValidationService $validatorService): JsonResponse
    {
        $email = trim((string) $request->input('email', ''));

        if (empty($email)) {
            return response()->json([
                'valid'          => false,
                'email'          => '',
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'message'        => 'Email address is required.'
            ], 422);
        }

        $result = $validatorService->validate($email);

        $status = $result['valid'] ? 200 : 422;

        return response()->json([
            'valid'          => $result['valid'],
            'email'          => $result['email'],
            'domain'         => $result['domain'],
            'deliverability' => $result['deliverability'] ?? 'UNKNOWN',
            'is_disposable'  => $result['is_disposable'] ?? false,
            'autocorrect'    => $result['autocorrect'] ?? null,
            'quality_score'  => $result['quality_score'] ?? null,
            'source'         => $result['source'] ?? 'validation',
            'message'        => $result['message'],
        ], $status);
    }
}
