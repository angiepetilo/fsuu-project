<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Venue::query();
        return response()->json($query->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'              => 'required|string|max:255',
            'avatar'            => 'nullable|string',
            'location'          => 'nullable|string|max:255',
            'capacity'          => 'nullable|integer|min:1',
            'status'            => 'nullable|string',
            'allowed_equipment' => 'nullable|array',
            'allowed_equipment.*' => 'integer|exists:equipment_types,id',
        ]);

        if (empty($data['capacity'])) {
            $data['capacity'] = 100;
        }

        if (!empty($data['avatar'])) {
            $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
        }

        $venue = Venue::create($data);

        return response()->json($venue, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);

        $data = $request->validate([
            'name'              => 'sometimes|string|max:255',
            'avatar'            => 'nullable|string',
            'location'          => 'nullable|string|max:255',
            'capacity'          => 'sometimes|integer|min:1',
            'status'            => 'sometimes|string',
            'allowed_equipment' => 'nullable|array',
            'allowed_equipment.*' => 'integer|exists:equipment_types,id',
        ]);

        if (array_key_exists('avatar', $data) && !empty($data['avatar'])) {
            $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
        }

        $venue->update($data);

        return response()->json($venue);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);
        $venue->delete();

        return response()->json(['message' => 'Venue deleted successfully']);
    }
}
