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
     * Create a new academic term.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_year' => 'required|string|max:50',
            'semester'      => 'required|string|max:50',
            'start_date'    => 'required|date',
            'end_date'      => 'required|date|after:start_date',
            'is_active'     => 'nullable|boolean',
        ]);

        $name = $validated['semester'] . ' AY ' . $validated['academic_year'];

        if (!empty($validated['is_active'])) {
            AcademicTerm::where('is_active', true)->update(['is_active' => false]);
        }

        $term = AcademicTerm::create([
            'name'          => $name,
            'academic_year' => $validated['academic_year'],
            'semester'      => $validated['semester'],
            'start_date'    => $validated['start_date'],
            'end_date'      => $validated['end_date'],
            'is_active'     => !empty($validated['is_active']),
        ]);

        return response()->json([
            'message' => "Academic term \"{$term->name}\" created successfully!",
            'term'    => $term,
        ], 201);
    }

    /**
     * Update an academic term.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $term = AcademicTerm::findOrFail($id);

        $validated = $request->validate([
            'academic_year' => 'sometimes|required|string|max:50',
            'semester'      => 'sometimes|required|string|max:50',
            'start_date'    => 'sometimes|required|date',
            'end_date'      => 'sometimes|required|date',
            'is_active'     => 'nullable|boolean',
        ]);

        if (isset($validated['semester']) || isset($validated['academic_year'])) {
            $year = $validated['academic_year'] ?? $term->academic_year;
            $sem = $validated['semester'] ?? $term->semester;
            $term->name = $sem . ' AY ' . $year;
        }

        if (isset($validated['is_active']) && $validated['is_active']) {
            AcademicTerm::where('id', '!=', $term->id)->update(['is_active' => false]);
            $term->is_active = true;
        }

        $term->fill($validated);
        $term->save();

        return response()->json([
            'message' => "Academic term \"{$term->name}\" updated successfully!",
            'term'    => $term,
        ]);
    }

    /**
     * Activate a specific academic term.
     */
    public function activate($id): JsonResponse
    {
        $term = AcademicTerm::findOrFail($id);

        AcademicTerm::where('is_active', true)->update(['is_active' => false]);
        $term->update(['is_active' => true]);

        return response()->json([
            'message' => "Academic term \"{$term->name}\" is now set as the ACTIVE semester.",
            'term'    => $term,
        ]);
    }

    /**
     * Delete an academic term.
     */
    public function destroy($id): JsonResponse
    {
        $term = AcademicTerm::findOrFail($id);

        if ($term->is_active) {
            return response()->json(['message' => 'Cannot delete the currently ACTIVE academic term.'], 422);
        }

        $term->delete();

        return response()->json(['message' => "Academic term \"{$term->name}\" deleted successfully."]);
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
