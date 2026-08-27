<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class VenueController extends Controller
{
    private function ensureSchema(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('venues')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'allowed_equipment')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->longText('allowed_equipment')->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'equipment_max_qtys')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->longText('equipment_max_qtys')->nullable();
                    });
                }
            }
        } catch (\Throwable $e) {}
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureSchema();
        $query = Venue::query();
        return response()->json($query->latest()->get());
    }

    public function show(int $id): JsonResponse
    {
        $this->ensureSchema();
        $venue = Venue::findOrFail($id);
        return response()->json($venue);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureSchema();
        $data = $request->validate([
            'name'                => 'required|string|max:255',
            'avatar'              => 'nullable|string',
            'location'            => 'nullable|string|max:255',
            'capacity'            => 'nullable|integer|min:1',
            'status'              => 'nullable|string',
            'allowed_equipment'   => 'nullable|array',
            'allowed_equipment.*' => 'nullable',
            'equipment_max_qtys'  => 'nullable',
        ]);

        if (empty($data['capacity'])) {
            $data['capacity'] = 100;
        }

        if (!empty($data['avatar'])) {
            $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
        }

        if (array_key_exists('allowed_equipment', $data)) {
            $data['allowed_equipment'] = is_array($data['allowed_equipment']) ? array_values(array_filter($data['allowed_equipment'])) : [];
        }

        if (array_key_exists('equipment_max_qtys', $data)) {
            $data['equipment_max_qtys'] = is_array($data['equipment_max_qtys']) ? $data['equipment_max_qtys'] : (is_string($data['equipment_max_qtys']) ? json_decode($data['equipment_max_qtys'], true) : []);
        }

        $venue = Venue::create($data);

        return response()->json($venue, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->ensureSchema();
        $venue = Venue::findOrFail($id);

        $data = $request->validate([
            'name'                => 'sometimes|string|max:255',
            'avatar'              => 'nullable|string',
            'location'            => 'nullable|string|max:255',
            'capacity'            => 'sometimes|integer|min:1',
            'status'              => 'sometimes|string',
            'allowed_equipment'   => 'nullable|array',
            'allowed_equipment.*' => 'nullable',
            'equipment_max_qtys'  => 'nullable',
        ]);

        if (array_key_exists('avatar', $data) && !empty($data['avatar'])) {
            $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
        }

        if (array_key_exists('allowed_equipment', $data)) {
            $data['allowed_equipment'] = is_array($data['allowed_equipment']) ? array_values(array_filter($data['allowed_equipment'])) : [];
        }

        if (array_key_exists('equipment_max_qtys', $data)) {
            $data['equipment_max_qtys'] = is_array($data['equipment_max_qtys']) ? $data['equipment_max_qtys'] : (is_string($data['equipment_max_qtys']) ? json_decode($data['equipment_max_qtys'], true) : []);
        }

        $venue->update($data);

        return response()->json($venue);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->ensureSchema();
        $venue = Venue::findOrFail($id);
        $venue->delete();

        return response()->json(['message' => 'Venue deleted successfully']);
    }
}
