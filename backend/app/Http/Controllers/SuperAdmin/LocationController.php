<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LocationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Location::latest()->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'   => 'required|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $data['slug'] = Str::slug($data['name']);
        if (empty($data['status'])) {
            $data['status'] = 'active';
        }

        $location = Location::create($data);

        return response()->json($location, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $location = Location::findOrFail($id);

        $data = $request->validate([
            'name'   => 'sometimes|string|max:255',
            'status' => 'sometimes|string|in:active,inactive',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $location->update($data);

        return response()->json($location);
    }

    public function destroy(int $id): JsonResponse
    {
        $location = Location::findOrFail($id);
        $location->delete();

        return response()->json(['message' => 'Location archived successfully']);
    }
}
