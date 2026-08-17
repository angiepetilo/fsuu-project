<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Services\AcademicTermService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicTermController extends Controller
{
    public function __construct(private AcademicTermService $termService) {}

    /**
     * List all academic terms (active + archived).
     */
    public function index(): JsonResponse
    {
        $active = $this->termService->getActiveTerm();
        $terms = AcademicTerm::with('closedByUser:id,name,email')
            ->orderBy('id', 'desc')
            ->get();

        $activeStats = $this->termService->getTermStats($active);

        return response()->json([
            'active_term' => array_merge($active->toArray(), $activeStats),
            'terms'       => $terms,
        ]);
    }

    /**
     * Get active academic term.
     */
    public function active(): JsonResponse
    {
        $active = $this->termService->getActiveTerm();
        $stats = $this->termService->getTermStats($active);

        return response()->json(array_merge($active->toArray(), $stats));
    }

    /**
     * Close the current semester and initialize the next academic term.
     */
    public function closeTerm(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized. Only Super Administrators can close an academic term.'], 403);
        }

        $validated = $request->validate([
            'academic_year' => 'required|string|max:50',
            'semester'      => 'required|string|max:50',
            'start_date'    => 'required|date',
            'end_date'      => 'required|date|after:start_date',
            'pin'           => 'nullable|string',
        ]);

        // Verify Master PIN if enabled
        if (\Illuminate\Support\Facades\Schema::hasTable('verification_pin_settings')) {
            $pinSetting = \App\Models\VerificationPinSetting::first();
            if ($pinSetting && $pinSetting->is_enabled) {
                if (empty($validated['pin']) || !password_verify($validated['pin'], $pinSetting->pin_hash)) {
                    return response()->json([
                        'message' => 'Invalid Security Verification PIN. Authorization failed.',
                        'errors'  => ['pin' => ['Invalid Master PIN.']]
                    ], 422);
                }
            }
        }

        $nextTerm = $this->termService->closeCurrentTermAndStartNext($validated, $user ?? \App\Models\User::first());

        return response()->json([
            'message'   => "Successfully archived completed semester into TiDB and initialized {$nextTerm->name}.",
            'next_term' => $nextTerm,
        ], 200);
    }
}
