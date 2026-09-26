<?php

namespace App\Http\Controllers\General;

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
            'min_capacity'        => 'nullable|integer|min:1',
            'max_capacity'        => 'nullable|integer|min:1',
            'status'              => 'nullable|string',
            'allowed_equipment'   => 'nullable|array',
            'allowed_equipment.*' => 'nullable',
            'equipment_max_qtys'  => 'nullable',
        ]);

        if (empty($data['capacity'])) {
            $data['capacity'] = !empty($data['max_capacity']) ? (int)$data['max_capacity'] : 100;
        }
        if (empty($data['max_capacity'])) {
            $data['max_capacity'] = (int)$data['capacity'];
        }
        if (empty($data['min_capacity'])) {
            $data['min_capacity'] = 1;
        }

        if (!empty($data['avatar'])) {
            try {
                $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
            } catch (\Throwable $e) {}
        }

        if (array_key_exists('allowed_equipment', $data)) {
            $data['allowed_equipment'] = is_array($data['allowed_equipment']) ? array_values(array_filter($data['allowed_equipment'])) : [];
        }

        if (array_key_exists('equipment_max_qtys', $data)) {
            $data['equipment_max_qtys'] = is_array($data['equipment_max_qtys']) ? $data['equipment_max_qtys'] : (is_string($data['equipment_max_qtys']) ? json_decode($data['equipment_max_qtys'], true) : []);
        }

        // Filter keys against actual database columns to prevent SQL unknown column errors
        try {
            $safeData = [];
            foreach ($data as $k => $v) {
                if (Schema::hasColumn('venues', $k)) {
                    $safeData[$k] = $v;
                }
            }
            if (!isset($safeData['name'])) {
                $safeData['name'] = $data['name'];
            }
            $venue = Venue::create($safeData);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('VenueController store error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to save venue: ' . $e->getMessage()], 500);
        }

        try {
            app(\App\Services\AuditLogService::class)->log(
                $request->user(),
                'VENUE_CREATED',
                'venues',
                $venue->id,
                ['description' => "Venue facility '{$venue->name}' created."]
            );
        } catch (\Throwable $t) {}

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
            'min_capacity'        => 'nullable|integer|min:1',
            'max_capacity'        => 'nullable|integer|min:1',
            'status'              => 'sometimes|string',
            'allowed_equipment'   => 'nullable|array',
            'allowed_equipment.*' => 'nullable',
            'equipment_max_qtys'  => 'nullable',
        ]);

        if (isset($data['max_capacity']) && !isset($data['capacity'])) {
            $data['capacity'] = (int)$data['max_capacity'];
        } elseif (isset($data['capacity']) && !isset($data['max_capacity'])) {
            $data['max_capacity'] = (int)$data['capacity'];
        }

        if (array_key_exists('avatar', $data) && !empty($data['avatar'])) {
            try {
                $data['avatar'] = app(\App\Services\MediaUploadService::class)->upload($data['avatar'], 'venues');
            } catch (\Throwable $e) {}
        }

        if (array_key_exists('allowed_equipment', $data)) {
            $data['allowed_equipment'] = is_array($data['allowed_equipment']) ? array_values(array_filter($data['allowed_equipment'])) : [];
        }

        if (array_key_exists('equipment_max_qtys', $data)) {
            $data['equipment_max_qtys'] = is_array($data['equipment_max_qtys']) ? $data['equipment_max_qtys'] : (is_string($data['equipment_max_qtys']) ? json_decode($data['equipment_max_qtys'], true) : []);
        }

        try {
            $safeData = [];
            foreach ($data as $k => $v) {
                if (Schema::hasColumn('venues', $k)) {
                    $safeData[$k] = $v;
                }
            }
            $venue->update($safeData);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('VenueController update error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update venue: ' . $e->getMessage()], 500);
        }

        try {
            app(\App\Services\AuditLogService::class)->log(
                $request->user(),
                'VENUE_UPDATED',
                'venues',
                $venue->id,
                ['description' => "Venue facility '{$venue->name}' updated."]
            );
        } catch (\Throwable $t) {}

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
