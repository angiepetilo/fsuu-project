<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Venue::with('office');

        if ($user && $user->office_id && !$user->isSuperAdmin()) {
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
            'allowed_equipment' => 'nullable|array',
            'allowed_equipment.*' => 'integer|exists:equipment_types,id',
        ]);

        if (empty($data['office_id']) && $user && $user->office_id) {
            $data['office_id'] = $user->office_id;
        }

        if (empty($data['capacity'])) {
            $data['capacity'] = 100;
        }

        if (!empty($data['avatar'])) {
            $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
        }

        $venue = Venue::create($data);

        return response()->json($venue->load('office'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);

        $user = $request->user();
        if ($user && $user->office_id && !$user->isSuperAdmin() && (int)$venue->office_id !== (int)$user->office_id) {
            return response()->json(['message' => 'Unauthorized to modify venues from another office.'], 403);
        }

        $data = $request->validate([
            'office_id' => 'sometimes|exists:offices,id',
            'name'      => 'sometimes|string|max:255',
            'avatar'    => 'nullable|string',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'sometimes|integer|min:1',
            'status'    => 'sometimes|string',
            'allowed_equipment' => 'nullable|array',
            'allowed_equipment.*' => 'integer|exists:equipment_types,id',
        ]);

        if (array_key_exists('avatar', $data) && !empty($data['avatar'])) {
            $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
        }

        $venue->update($data);

        return response()->json($venue->load('office'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);

        $user = $request->user();
        if ($user && $user->office_id && !$user->isSuperAdmin() && (int)$venue->office_id !== (int)$user->office_id) {
            return response()->json(['message' => 'Unauthorized to delete venues from another office.'], 403);
        }

        $venue->delete();

        return response()->json(['message' => 'Venue deleted successfully']);
    }
}
