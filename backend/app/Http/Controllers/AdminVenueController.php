<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Venue::with('office');

        if ($user && $user->office_id) {
            $query->where('office_id', $user->office_id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'office_id' => 'nullable|exists:offices,id',
            'name'      => 'required|string|max:255',
            'avatar'    => 'nullable|string',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'nullable|integer|min:1',
            'status'    => 'nullable|string',
        ]);

        if (empty($data['office_id'])) {
            $data['office_id'] = $user->office_id ?? (\App\Models\Office::first()?->id ?? 1);
        }

        if (empty($data['capacity'])) {
            $data['capacity'] = 100;
        }

        $venue = Venue::create($data);

        return response()->json($venue->load('office'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);

        $data = $request->validate([
            'office_id' => 'sometimes|exists:offices,id',
            'name'      => 'sometimes|string|max:255',
            'avatar'    => 'nullable|string',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'sometimes|integer|min:1',
            'status'    => 'sometimes|string',
        ]);

        $venue->update($data);

        return response()->json($venue->load('office'));
    }

    public function destroy(int $id): JsonResponse
    {
        // Soft delete — sets deleted_at; record stays in database
        $venue = Venue::findOrFail($id);
        $venue->delete();

        return response()->json(['message' => 'Venue archived (soft-deleted)']);
    }
}
