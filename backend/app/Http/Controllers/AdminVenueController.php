<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVenueController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Venue::with('office')->latest()->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'office_id' => 'nullable|exists:offices,id',
            'name'      => 'required|string|max:255',
            'avatar'    => 'nullable|string',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'nullable|integer|min:1',
            'status'    => 'nullable|string',
        ]);

        if (empty($data['office_id'])) {
            $office = \App\Models\Office::first() ?? \App\Models\Office::create(['name' => 'FSUU Main Campus AVR Office', 'slug' => 'fsuu-main-campus-avr-office']);
            $data['office_id'] = $office->id;
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
