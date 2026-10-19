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
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'min_capacity')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->integer('min_capacity')->default(1)->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'max_capacity')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->integer('max_capacity')->default(100)->nullable();
                    });
                }
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

        $existingVenue = Venue::whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($data['name']))])->first();
        if ($existingVenue) {
            return response()->json([
                'message' => 'This venue already exists.',
                'errors'  => ['name' => ['This venue already exists.']]
            ], 422);
        }

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

        return response()->json($venue->fresh(), 201);
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

        if (!empty($data['name'])) {
            $existingVenue = Venue::whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($data['name']))])
                ->where('id', '!=', $id)
                ->first();
            if ($existingVenue) {
                return response()->json([
                    'message' => 'This venue already exists.',
                    'errors'  => ['name' => ['This venue already exists.']]
                ], 422);
            }
        }

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

        return response()->json($venue->fresh());
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->ensureSchema();
        $venue = Venue::findOrFail($id);

        $hasActiveBookings = \App\Models\VenueBooking::where('venue_id', $venue->id)
            ->where(function ($q) {
                $q->whereHas('trackingNumber', function ($t) {
                    $t->whereIn('status', ['pending', 'approved', 'ongoing', 'on-going']);
                });
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                    $q->orWhereIn('status', ['pending', 'approved', 'ongoing', 'on-going']);
                }
            })
            ->exists();

        if ($hasActiveBookings && !$request->boolean('force')) {
            return response()->json([
                'message' => "Cannot delete venue '{$venue->name}' because it has active or pending bookings. You can disable the venue instead.",
            ], 422);
        }

        $venueName = $venue->name;
        $venue->delete();

        try {
            app(\App\Services\AuditLogService::class)->log(
                $request->user(),
                'VENUE_DELETED',
                'venues',
                $id,
                ['description' => "Venue facility '{$venueName}' deleted."]
            );
        } catch (\Throwable $t) {}

        return response()->json(['message' => "Venue '{$venueName}' deleted successfully."]);
    }

    /**
     * Bulk import venue facilities from Excel / CSV parsed payload.
     */
    public function bulkImport(Request $request): JsonResponse
    {
        $this->ensureSchema();
        $rawVenues = $request->input('venues');
        if (!is_array($rawVenues) || empty($rawVenues)) {
            return response()->json([
                'message' => 'No venue data provided for import.',
                'errors'  => ['venues' => ['No records provided.']]
            ], 422);
        }

        if (count($rawVenues) > 500) {
            return response()->json([
                'message' => 'Cannot import more than 500 venues at a time.',
            ], 422);
        }

        $createdCount = 0;
        $updatedCount = 0;
        $processedVenues = [];

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($rawVenues as $row) {
                $rawName = trim((string)($row['name'] ?? $row['venue_name'] ?? ''));
                if ($rawName === '') {
                    continue; // Skip rows without a name
                }

                $rawCapacity = (int)($row['capacity'] ?? $row['max_capacity'] ?? 100);
                if ($rawCapacity <= 0) $rawCapacity = 100;
                $rawMin = max(1, (int)($row['min_capacity'] ?? 1));
                $rawMax = max($rawMin, (int)($row['max_capacity'] ?? $rawCapacity));

                $rawStatus = strtolower(trim((string)($row['status'] ?? 'available')));
                if (!in_array($rawStatus, ['available', 'maintenance', 'archived', 'disabled'])) {
                    $rawStatus = 'available';
                }

                $venueData = [
                    'name'         => $rawName,
                    'location'     => !empty($row['location']) ? trim((string)$row['location']) : null,
                    'capacity'     => $rawCapacity,
                    'min_capacity' => $rawMin,
                    'max_capacity' => $rawMax,
                    'status'       => $rawStatus,
                ];

                if (!empty($row['description']) && Schema::hasColumn('venues', 'description')) {
                    $venueData['description'] = trim((string)$row['description']);
                }

                $existing = Venue::whereRaw('LOWER(TRIM(name)) = ?', [strtolower($rawName)])->first();
                if ($existing) {
                    $existing->update($venueData);
                    $processedVenues[] = $existing->fresh();
                    $updatedCount++;
                } else {
                    $newVenue = Venue::create($venueData);
                    $processedVenues[] = $newVenue;
                    $createdCount++;
                }
            }

            \Illuminate\Support\Facades\DB::commit();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Illuminate\Support\Facades\Log::error('VenueController bulkImport failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to import venues: ' . $e->getMessage()
            ], 500);
        }

        try {
            app(\App\Services\AuditLogService::class)->log(
                $request->user(),
                'VENUE_BULK_IMPORTED',
                'venues',
                !empty($processedVenues) ? $processedVenues[0]->id : null,
                [
                    'count'         => count($processedVenues),
                    'created_count' => $createdCount,
                    'updated_count' => $updatedCount,
                    'description'   => count($processedVenues) . " venue facilities imported via file by " . (auth()->user()?->name ?? 'Staff'),
                ]
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message'       => count($processedVenues) . " venue facilities processed ({$createdCount} added, {$updatedCount} updated).",
            'count'         => count($processedVenues),
            'created_count' => $createdCount,
            'updated_count' => $updatedCount,
            'venues'        => $processedVenues,
        ], 201);
    }
}
