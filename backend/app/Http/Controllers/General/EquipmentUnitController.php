<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;

class EquipmentUnitController extends Controller
{
    /**
     * Display a listing of all physical equipment units.
     */
    public function index(Request $request): JsonResponse
    {
        \App\Services\EquipmentCategoryService::autoSyncUnitConditions();

        // Include disabled (soft-deleted) units so the UI can show them greyed out.
        $units = EquipmentUnit::withTrashed()
            ->with('equipmentType')
            ->latest()
            ->get()
            ->map(function ($unit) {
                $arr = $unit->toArray();
                $arr['is_disabled'] = !is_null($unit->archived_at);
                return $arr;
            });

        return response()->json($units);
    }

    /**
     * Store a newly created physical equipment unit and update category stock count.
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Normalize equipment_type_id from aliases (category_id, category name)
        if (!$request->has('equipment_type_id') || empty($request->input('equipment_type_id'))) {
            if ($request->filled('category_id')) {
                $request->merge(['equipment_type_id' => $request->input('category_id')]);
            } elseif ($request->filled('category')) {
                $cat = EquipmentType::where('eq_name', $request->input('category'))
                    ->orWhere('name', $request->input('category'))
                    ->first();
                if ($cat) {
                    $request->merge(['equipment_type_id' => $cat->id]);
                }
            }
        }

        // 2. Normalize serial_number and barcode so barcode = serial no.
        $rawSerial = trim((string)(
            $request->input('serial_number') 
            ?? $request->input('serial_no') 
            ?? $request->input('barcode') 
            ?? $request->input('unit_code') 
            ?? $request->input('code') 
            ?? ''
        ));
        $request->merge([
            'serial_number' => $rawSerial !== '' ? $rawSerial : null,
            'barcode'       => $rawSerial !== '' ? $rawSerial : null,
        ]);

        // 3. Normalize dates and numeric lifespans
        if ($request->input('purchased_at') === '' || $request->input('date_purchased') === '') {
            $request->merge(['purchased_at' => null]);
        } elseif (!$request->has('purchased_at') && $request->filled('date_purchased')) {
            $request->merge(['purchased_at' => $request->input('date_purchased')]);
        }
        if ($request->input('eq_lifespan') === '' || $request->input('lifespan_years') === '') {
            $request->merge(['eq_lifespan' => 5]);
        } elseif (!$request->has('eq_lifespan') && $request->filled('lifespan_years')) {
            $request->merge(['eq_lifespan' => (int)$request->input('lifespan_years')]);
        }

        $quantity = max(1, (int)($request->input('quantity') ?? $request->input('total_units') ?? 1));

        if ($quantity > 1) {
            $validated = $request->validate([
                'equipment_type_id' => 'required|exists:equipment_types,id',
                'brand'             => 'nullable|string|max:255',
                'model'             => 'nullable|string|max:255',
                'purchased_at'      => 'nullable|date',
                'eq_lifespan'       => 'nullable|integer|min:1',
                'status'            => 'nullable|string|max:50',
                'condition'         => 'nullable|string|max:100',
            ], [
                'equipment_type_id.required' => 'The equipment category is required.',
                'equipment_type_id.exists'   => 'The selected equipment category does not exist.',
            ]);

            $rawCondition = $request->input('condition', 'Good');
            $canonicalCondition = match(strtolower(trim((string)$rawCondition))) {
                'damaged' => 'Damaged',
                'lost' => 'Lost',
                'under repair', 'under_repair' => 'Under Repair',
                'minor wear' => 'Minor Wear',
                default => 'Good',
            };

            // Determine serial numbers to use
            $inputSerials = $request->input('serials') ?? $request->input('serial_numbers') ?? $request->input('barcodes');
            $serialsToUse = [];
            if (is_array($inputSerials) && count($inputSerials) === $quantity) {
                $serialsToUse = array_map(fn($b) => trim((string)$b), $inputSerials);
            } else {
                $base = $rawSerial;
                if ($base === '') {
                    $base = 'SN-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2))) . '-01';
                }
                if (preg_match('/^(.*?)(\d+)$/', $base, $matches)) {
                    $prefix = $matches[1];
                    $startNum = (int)$matches[2];
                    $padLen = strlen($matches[2]);
                    for ($i = 0; $i < $quantity; $i++) {
                        $serialsToUse[] = $prefix . str_pad((string)($startNum + $i), $padLen, '0', STR_PAD_LEFT);
                    }
                } else {
                    for ($i = 1; $i <= $quantity; $i++) {
                        $serialsToUse[] = $base . '-' . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
                    }
                }
            }

            // Uniqueness check across database for both serial_number and barcode
            $existing = EquipmentUnit::where(function ($q) use ($serialsToUse) {
                $q->whereIn('barcode', $serialsToUse)
                  ->orWhereIn('serial_number', $serialsToUse);
            })->whereNull('archived_at')->pluck('barcode')->toArray();

            if (!empty($existing)) {
                return response()->json([
                    'message' => 'The following Serial No.(s) are already assigned: ' . implode(', ', $existing) . '. Each unit requires a unique Serial No.',
                    'errors'  => ['serial_number' => ['Serial No.(s) already in use: ' . implode(', ', $existing)]],
                ], 422);
            }

            $createdUnits = [];
            DB::beginTransaction();
            try {
                foreach ($serialsToUse as $sn) {
                    $createdUnits[] = EquipmentUnit::create([
                        'equipment_type_id' => $validated['equipment_type_id'],
                        'brand'             => $validated['brand'] ?? null,
                        'model'             => $validated['model'] ?? null,
                        'serial_number'     => $sn,
                        'barcode'           => $sn,
                        'purchased_at'      => $validated['purchased_at'] ?? now()->toDateString(),
                        'eq_lifespan'       => $validated['eq_lifespan'] ?? 5,
                        'status'            => isset($validated['status']) ? strtolower(trim($validated['status'])) : 'available',
                        'condition'         => $canonicalCondition,
                        'description'       => null,
                    ]);
                }
                $this->syncCategoryStock($validated['equipment_type_id']);
                DB::commit();
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }

            try {
                AuditLog::create([
                    'user_id'        => auth()->id(),
                    'action'         => 'EQUIPMENT_UNIT_BATCH_CREATED',
                    'auditable_type' => 'equipment_units',
                    'auditable_id'   => $createdUnits[0]->id,
                    'metadata'       => [
                        'count'         => count($createdUnits),
                        'brand'         => $validated['brand'] ?? null,
                        'model'         => $validated['model'] ?? null,
                        'category_id'   => $validated['equipment_type_id'],
                        'serial_numbers'=> $serialsToUse,
                        'description'   => count($createdUnits) . " physical equipment units registered by " . (auth()->user()?->name ?? 'Staff'),
                    ],
                    'ip_address'     => request()->ip(),
                    'created_at'     => now(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json([
                'message' => count($createdUnits) . ' physical units registered successfully.',
                'count'   => count($createdUnits),
                'units'   => $createdUnits,
            ], 201);
        }

        $validated = $request->validate([
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'brand'             => 'nullable|string|max:255',
            'model'             => 'nullable|string|max:255',
            'serial_number'     => 'nullable|string|max:255',
            'barcode'           => 'nullable|string|max:255',
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'built_in_units'    => 'nullable',
            'built_in_models'   => 'nullable',
            'description'       => 'nullable|string',
        ], [
            'equipment_type_id.required' => 'The equipment category is required.',
            'equipment_type_id.exists'   => 'The selected equipment category does not exist.',
        ]);

        $finalSerial = $rawSerial !== '' ? $rawSerial : null;

        if ($finalSerial) {
            $duplicate = EquipmentUnit::where(function ($q) use ($finalSerial) {
                $q->where('barcode', $finalSerial)
                  ->orWhere('serial_number', $finalSerial);
            })->whereNull('archived_at')->first();

            if ($duplicate) {
                return response()->json([
                    'message' => "The Serial No. '{$finalSerial}' is already assigned to another physical unit. Serial numbers must be unique.",
                    'errors'  => ['serial_number' => ["Serial No. '{$finalSerial}' is already in use."]],
                ], 422);
            }
        }

        $rawCondition = $request->input('condition', 'Good');
        $canonicalCondition = match(strtolower(trim((string)$rawCondition))) {
            'damaged' => 'Damaged',
            'lost' => 'Lost',
            'under repair', 'under_repair' => 'Under Repair',
            'minor wear' => 'Minor Wear',
            default => 'Good',
        };

        $builtInUnits = $request->input('built_in_units');
        if (is_string($builtInUnits)) {
            $builtInUnits = json_decode($builtInUnits, true) ?: [];
        }
        if (!is_array($builtInUnits)) {
            $builtInUnits = [];
        }
        $finalBuiltInUnits = array_values(array_filter($builtInUnits, fn($val) => !empty($val)));

        $unitData = [
            'equipment_type_id' => $validated['equipment_type_id'],
            'brand'             => $validated['brand'] ?? null,
            'model'             => $validated['model'] ?? null,
            'serial_number'     => $finalSerial,
            'barcode'           => $finalSerial,
            'purchased_at'      => $validated['purchased_at'] ?? now()->toDateString(),
            'eq_lifespan'       => $validated['eq_lifespan'] ?? 5,
            'status'            => isset($validated['status']) ? strtolower(trim($validated['status'])) : 'available',
            'condition'         => $canonicalCondition,
            'description'       => $validated['description'] ?? null,
        ];
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'built_in_units')) {
            $unitData['built_in_units'] = !empty($finalBuiltInUnits) ? $finalBuiltInUnits : null;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'built_in_models')) {
            $unitData['built_in_models'] = !empty($builtInModels) ? $builtInModels : null;
        }

        $unit = EquipmentUnit::create($unitData);

        // Sync category stock count
        $this->syncCategoryStock($unit->equipment_type_id);

        try {
            $unit->load('equipmentType');
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'EQUIPMENT_UNIT_CREATED',
                'auditable_type' => 'equipment_units',
                'auditable_id'   => $unit->id,
                'metadata'       => [
                    'barcode'     => $unit->barcode,
                    'brand'       => $unit->brand,
                    'model'       => $unit->model,
                    'category'    => $unit->equipmentType?->name ?? $unit->equipmentType?->eq_name,
                    'built_in'    => $unit->built_in_units,
                    'description' => "Physical equipment unit {$unit->barcode} ({$unit->brand} {$unit->model}) added by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json($unit->load('equipmentType'), 201);
    }

    /**
     * Update the specified physical equipment unit.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::with('equipmentType')->findOrFail($id);

        // Normalize aliases for update
        if ($request->filled('category_id') && !$request->has('equipment_type_id')) {
            $request->merge(['equipment_type_id' => $request->input('category_id')]);
        }
        if ($request->filled('unit_code') && !$request->has('barcode')) {
            $request->merge(['barcode' => trim((string)$request->input('unit_code'))]);
        } elseif ($request->has('barcode')) {
            $request->merge(['barcode' => trim((string)$request->input('barcode'))]);
        }
        if ($request->input('purchased_at') === '' || $request->input('date_purchased') === '') {
            $request->merge(['purchased_at' => null]);
        }
        if ($request->input('eq_lifespan') === '' || $request->input('lifespan_years') === '') {
            $request->merge(['eq_lifespan' => 5]);
        }

        $validated = $request->validate([
            'equipment_type_id' => 'sometimes|exists:equipment_types,id',
            'brand'             => 'nullable|string|max:255',
            'model'             => 'nullable|string|max:255',
            'serial_number'     => 'nullable|string|max:255',
            'barcode'           => 'nullable|string|max:255',
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'built_in_units'    => 'nullable',
            'built_in_models'   => 'nullable',
            'description'       => 'nullable|string',
            'reason'            => 'nullable|string|max:500',
        ]);

        $userReason = trim($request->input('reason', ''));
        unset($validated['reason']);

        $serialVal = trim((string)(
            $request->input('serial_number') 
            ?? $request->input('serial_no') 
            ?? $request->input('barcode') 
            ?? $request->input('unit_code') 
            ?? ''
        ));

        if ($serialVal !== '') {
            $duplicate = EquipmentUnit::where('id', '!=', $unit->id)
                ->where(function ($q) use ($serialVal) {
                    $q->where('barcode', $serialVal)
                      ->orWhere('serial_number', $serialVal);
                })->whereNull('archived_at')->first();

            if ($duplicate) {
                return response()->json([
                    'message' => "The Serial No. '{$serialVal}' is already assigned to another physical unit.",
                    'errors'  => ['serial_number' => ["Serial No. '{$serialVal}' is already in use."]],
                ], 422);
            }

            $validated['serial_number'] = $serialVal;
            $validated['barcode'] = $serialVal;
        }

        if (isset($validated['condition'])) {
            $validated['condition'] = match(strtolower(trim($validated['condition']))) {
                'damaged' => 'Damaged',
                'lost' => 'Lost',
                'under repair', 'under_repair' => 'Under Repair',
                'minor wear' => 'Minor Wear',
                default => 'Good',
            };
        }

        if (array_key_exists('barcode', $validated)) {
            $validated['barcode'] = !empty($validated['barcode']) ? trim($validated['barcode']) : null;
        }

        if (isset($validated['status'])) {
            $validated['status'] = strtolower(trim($validated['status']));
        }

        if ($request->has('built_in_units')) {
            $rawBuiltIn = $request->input('built_in_units');
            if (is_string($rawBuiltIn)) {
                $rawBuiltIn = json_decode($rawBuiltIn, true) ?: [];
            }
            if (is_array($rawBuiltIn)) {
                $validated['built_in_units'] = array_values(array_filter($rawBuiltIn, fn($val) => !empty($val)));
            } else {
                $validated['built_in_units'] = null;
            }
        }

        if ($request->has('built_in_models')) {
            $rawModels = $request->input('built_in_models');
            if (is_string($rawModels)) {
                $rawModels = json_decode($rawModels, true) ?: [];
            }
            $validated['built_in_models'] = is_array($rawModels) ? $rawModels : null;
        }

        if (!\Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'built_in_units')) {
            unset($validated['built_in_units']);
        }
        if (!\Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'built_in_models')) {
            unset($validated['built_in_models']);
        }

        $oldTypeId    = $unit->equipment_type_id;
        $oldStatus    = $unit->status;
        $oldCondition = $unit->condition;

        if ($userReason && empty($validated['description'])) {
            $validated['description'] = $userReason;
        }

        $unit->update($validated);

        // Keep child built-in units in sync with parent's serial number
        if (!empty($unit->built_in_units) && is_array($unit->built_in_units) && !empty($unit->serial_number)) {
            EquipmentUnit::whereIn('id', $unit->built_in_units)->update([
                'serial_number' => $unit->serial_number,
            ]);
        }

        // Sync category stock counts for old and new category
        $this->syncCategoryStock($oldTypeId);
        if ($unit->equipment_type_id !== $oldTypeId) {
            $this->syncCategoryStock($unit->equipment_type_id);
        }

        // Determine what triggered the stats change
        $triggerParts = [];
        $newCond = $unit->condition;
        $newStat = $unit->status;

        $conditionChanged = $newCond && strcasecmp((string)$newCond, (string)($oldCondition ?? '')) !== 0;
        $statusChanged    = $newStat && strcasecmp((string)$newStat, (string)($oldStatus ?? '')) !== 0;

        if ($conditionChanged && $statusChanged) {
            $triggerParts[] = "Condition: '{$oldCondition}' → '{$newCond}', Status: '{$oldStatus}' → '{$newStat}'";
        } elseif ($conditionChanged) {
            $triggerParts[] = "Condition: '{$oldCondition}' → '{$newCond}'";
        } elseif ($statusChanged) {
            $triggerParts[] = "Status: '{$oldStatus}' → '{$newStat}'";
        }

        if ($userReason) {
            $triggerParts[] = "Reason: {$userReason}";
        }

        $triggerSummary = count($triggerParts) > 0 ? implode(' | ', $triggerParts) : "Unit details updated";
        $descriptionText = "{$triggerSummary} (Unit {$unit->barcode}) by " . (auth()->user()?->name ?? 'Staff');

        try {
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'EQUIPMENT_UNIT_UPDATED',
                'auditable_type' => 'equipment_units',
                'auditable_id'   => $unit->id,
                'metadata'       => [
                    'barcode'            => $unit->barcode,
                    'condition'          => $unit->condition,
                    'previous_condition' => $oldCondition,
                    'status'             => $unit->status,
                    'previous_status'    => $oldStatus,
                    'trigger'            => $triggerSummary,
                    'reason'             => $userReason ?: null,
                    'description'        => $descriptionText,
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json($unit->load('equipmentType'));
    }

    /**
     * Soft-delete physical equipment unit and decrement category stock.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::with('equipmentType')->findOrFail($id);

        $typeId = $unit->equipment_type_id;

        $unit->delete();

        $this->syncCategoryStock($typeId);

        try {
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'EQUIPMENT_UNIT_DELETED',
                'auditable_type' => 'equipment_units',
                'auditable_id'   => $unit->id,
                'metadata'       => [
                    'barcode'     => $unit->barcode,
                    'condition'   => $unit->condition,
                    'status'      => 'disabled',
                    'trigger'     => "Unit disabled (Barcode: {$unit->barcode})",
                    'description' => "Equipment unit {$unit->barcode} disabled by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Equipment unit disabled successfully']);
    }

    /**
     * Re-enable a previously disabled (soft-deleted) equipment unit.
     */
    public function enable(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::withTrashed()->findOrFail($id);

        if (is_null($unit->archived_at)) {
            return response()->json(['message' => 'Unit is already active.'], 422);
        }

        $unit->restore(); // clears archived_at via SoftDeletes

        $this->syncCategoryStock($unit->equipment_type_id);

        try {
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'EQUIPMENT_UNIT_ENABLED',
                'auditable_type' => 'equipment_units',
                'auditable_id'   => $unit->id,
                'metadata'       => [
                    'barcode'     => $unit->barcode,
                    'condition'   => $unit->condition,
                    'status'      => $unit->status,
                    'trigger'     => "Unit re-enabled into active inventory (Barcode: {$unit->barcode})",
                    'description' => "Equipment unit {$unit->barcode} re-enabled by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Equipment unit enabled successfully', 'unit' => $unit->load('equipmentType')]);
    }

    /**
     * Helper to dynamically calculate and update EquipmentType stock counts
     */
    public function syncCategoryStock(int $typeId): void
    {
        try {
            $type = EquipmentType::find($typeId);
            if (!$type) return;

            $totalUnits = EquipmentUnit::where('equipment_type_id', $typeId)->whereNull('archived_at')->count();
            $availableUnits = EquipmentUnit::where('equipment_type_id', $typeId)
                ->whereNull('archived_at')
                ->whereRaw("LOWER(COALESCE(equipment_units.status, 'available')) NOT IN ('damaged', 'lost', 'decommissioned', 'maintenance', 'released', 'in_use', 'borrowed', 'in-use', 'reserved', 'unavailable')")
                ->whereRaw("LOWER(COALESCE(equipment_units.condition, 'good')) NOT IN ('damaged', 'lost', 'under repair', 'under_repair', 'worn', 'minor wear')")
                ->count();

            $damagedUnits = EquipmentUnit::where('equipment_type_id', $typeId)
                ->whereNull('archived_at')
                ->where(function($q) {
                    $q->whereRaw("LOWER(COALESCE(equipment_units.status, 'available')) IN ('damaged', 'maintenance', 'unavailable')")
                      ->orWhereRaw("LOWER(COALESCE(equipment_units.condition, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair')");
                })
                ->whereRaw("LOWER(COALESCE(equipment_units.status, 'available')) NOT IN ('lost', 'decommissioned')")
                ->whereRaw("LOWER(COALESCE(equipment_units.condition, 'good')) NOT IN ('lost', 'decommissioned')")
                ->count();

            $lostUnits = EquipmentUnit::where('equipment_type_id', $typeId)
                ->whereNull('archived_at')
                ->where(function($q) {
                    $q->whereRaw("LOWER(COALESCE(equipment_units.status, 'available')) IN ('lost', 'decommissioned')")
                      ->orWhereRaw("LOWER(COALESCE(equipment_units.condition, 'good')) IN ('lost', 'decommissioned')");
                })
                ->count();

            $type->update([
                'total_quantity'  => $totalUnits,
                'available_count' => $availableUnits,
                'damaged_count'   => $damagedUnits,
                'lost_count'      => $lostUnits,
            ]);
        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\Log::warning("Failed to sync category stock for type {$typeId}: " . $th->getMessage());
        }
    }
}
