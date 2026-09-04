<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\FeeMatrix;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeMatrixController extends Controller
{
    /**
     * Display a listing of fee matrices or fee matrix for a specific venue.
     */
    public function index(Request $request): JsonResponse
    {
        if (FeeMatrix::count() === 0) {
            FeeMatrix::create([
                'venue_id'        => null,
                'title'           => 'Facility Rental Fee Schedule and Reservation Policy',
                'show_signatures' => true,
                'show_rate_items' => true,
                'notes_enabled'   => true,
                'notes'           => 'Internal FSUU events and official academic activities are free of charge. External rentals require prior fee matrix approval. A 50% downpayment is required to confirm and lock the reservation schedule.',
                'signatories'     => [
                    ['id' => 'sig-1', 'name' => 'Dr. Maria Angela Santos', 'title' => 'AVR Operations Head']
                ],
                'rate_items'      => [
                    ['id' => 'rate-1', 'description' => 'Internal Academic and Dept Rate', 'rate' => 'Free of Charge', 'enabled' => true],
                    ['id' => 'rate-2', 'description' => 'External Hourly Rental Rate', 'rate' => '₱1,500 per hour', 'enabled' => true],
                    ['id' => 'rate-3', 'description' => 'External Full Day Rate', 'rate' => '₱8,000 per day', 'enabled' => true],
                    ['id' => 'rate-4', 'description' => 'Facility Cleaning Fee', 'rate' => '₱200', 'enabled' => true],
                    ['id' => 'rate-5', 'description' => 'Sound System & Tech Setup Fee', 'rate' => '₱500', 'enabled' => true],
                ],
            ]);
        }

        if ($request->filled('venue_id')) {
            $venueId = $request->input('venue_id');
            $matrix = FeeMatrix::with('venue')->where('venue_id', $venueId)->first();
            
            if (!$matrix) {
                // Return default matrix if venue specific does not exist yet
                $matrix = FeeMatrix::with('venue')->whereNull('venue_id')->first();
            }

            return response()->json($matrix);
        }

        $matrices = FeeMatrix::with('venue')->latest()->get();
        return response()->json($matrices);
    }

    /**
     * Store or update a fee matrix for a venue.
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        if ($user && method_exists($user, 'isSuperAdmin') && !$user->isSuperAdmin()) {
            if (method_exists($user, 'hasPermission') && !$user->hasPermission('settings') && !$user->hasPermission('venues.manage')) {
                return response()->json(['message' => 'Unauthorized access to Fee Matrix settings.'], 403);
            }
        }

        $validated = $request->validate([
            'venue_id'        => 'nullable|exists:venues,id',
            'title'           => 'required|string|max:255',
            'show_signatures' => 'nullable|boolean',
            'show_rate_items' => 'nullable|boolean',
            'notes_enabled'   => 'nullable|boolean',
            'notes'           => 'nullable|string',
            'signatories'     => 'nullable|array',
            'rate_items'      => 'nullable|array',
        ]);

        $matrix = FeeMatrix::updateOrCreate(
            ['venue_id' => $validated['venue_id'] ?? null],
            [
                'title'           => $validated['title'],
                'show_signatures' => $validated['show_signatures'] ?? true,
                'show_rate_items' => $validated['show_rate_items'] ?? true,
                'notes_enabled'   => $validated['notes_enabled'] ?? true,
                'notes'           => $validated['notes'] ?? null,
                'signatories'     => $validated['signatories'] ?? [],
                'rate_items'      => $validated['rate_items'] ?? [],
            ]
        );

        return response()->json($matrix->load('venue'), 200);
    }

    /**
     * Update an existing fee matrix by ID.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $matrix = FeeMatrix::findOrFail($id);

        $validated = $request->validate([
            'venue_id'        => 'nullable|exists:venues,id',
            'title'           => 'sometimes|string|max:255',
            'show_signatures' => 'nullable|boolean',
            'show_rate_items' => 'nullable|boolean',
            'notes_enabled'   => 'nullable|boolean',
            'notes'           => 'nullable|string',
            'signatories'     => 'nullable|array',
            'rate_items'      => 'nullable|array',
        ]);

        $matrix->update($validated);

        return response()->json($matrix->load('venue'));
    }

    /**
     * Remove a fee matrix entry.
     */
    public function destroy(int $id): JsonResponse
    {
        $matrix = FeeMatrix::findOrFail($id);
        $matrix->delete();

        return response()->json(['message' => 'Fee matrix deleted successfully']);
    }
}
