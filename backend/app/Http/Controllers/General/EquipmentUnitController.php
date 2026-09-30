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

        // Resolve parent and child availability if built-in units assigned
        $this->resolveParentAndChildrenStatus($unit);

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

            // "configure that if the equipment unit condition is good it will automatically available"
            $currentStatus = strtolower(trim($validated['status'] ?? $unit->status ?? 'available'));
            if (!in_array($currentStatus, ['released', 'in_use', 'reserved'], true)) {
                if ($validated['condition'] === 'Good') {
                    $uid = (string)$unit->id;
                    $uBar = (string)($unit->barcode ?? '');
                    $isChild = false;
                    $allParents = EquipmentUnit::whereNotNull('built_in_units')
                        ->whereNull('archived_at')
                        ->where('id', '!=', $unit->id)
                        ->get(['id', 'built_in_units']);
                    foreach ($allParents as $p) {
                        $pList = is_array($p->built_in_units) ? $p->built_in_units : json_decode($p->built_in_units, true);
                        if (is_array($pList) && (in_array($uid, $pList) || ($uBar && in_array($uBar, $pList)))) {
                            $isChild = true;
                            break;
                        }
                    }
                    $validated['status'] = $isChild ? 'built-in' : 'available';
                } elseif ($validated['condition'] === 'Damaged') {
                    $validated['status'] = 'damaged';
                } elseif ($validated['condition'] === 'Lost') {
                    $validated['status'] = 'lost';
                } elseif (in_array($validated['condition'], ['Under Repair', 'Minor Wear'], true)) {
                    $validated['status'] = 'unavailable';
                }
            }
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

        $oldBuiltIn = is_array($unit->built_in_units) ? $unit->built_in_units : (is_string($unit->built_in_units) ? json_decode($unit->built_in_units, true) : null);
        $unit->update($validated);



        // Automatically resolve parent and child availability and sync all affected category stocks
        $this->resolveParentAndChildrenStatus($unit, is_array($oldBuiltIn) ? $oldBuiltIn : null);

        // Sync category stock counts for old category if it changed
        if ($oldTypeId && (int)$unit->equipment_type_id !== (int)$oldTypeId) {
            $this->syncCategoryStock((int)$oldTypeId);
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
     * Automatically resolves parent and child equipment unit availability.
     * 1. If $unit is a child of one or more parent units:
     *    - If $unit is Good, check all siblings in each parent. If all siblings are Good,
     *      restore parent to status = 'available'.
     *    - If $unit is Damaged/Lost/Under Repair, mark parent status = 'unavailable'.
     * 2. If $unit is a parent unit (has built_in_units):
     *    - Check all current children. If all are Good and parent is Good,
     *      set parent status = 'available'.
     *    - If any child is Damaged/Lost, set parent status = 'unavailable'.
     * 3. If children were removed/replaced, handles any old children freed up.
     *
     * Returns array of all affected equipment_type_ids that were re-synced.
     */
    public function resolveParentAndChildrenStatus(EquipmentUnit $unit, ?array $oldBuiltInRefs = null): array
    {
        $affectedTypeIds = [(int)$unit->equipment_type_id];
        $uid = (string)$unit->id;
        $uBarcode = (string)($unit->barcode ?: '');
        $uSerial = (string)($unit->serial_number ?: '');

        // ── 1. If $unit is a child of any parent unit(s) ──────────────────────
        $allParents = EquipmentUnit::whereNotNull('built_in_units')
            ->whereNull('archived_at')
            ->where('id', '!=', $unit->id)
            ->get();

        foreach ($allParents as $parent) {
            $rawList = is_array($parent->built_in_units)
                ? $parent->built_in_units
                : (is_string($parent->built_in_units) ? json_decode($parent->built_in_units, true) : []);
            if (!is_array($rawList)) continue;

            $containsThisUnit = false;
            foreach ($rawList as $ref) {
                $strRef = (string)$ref;
                if ($strRef === $uid || ($uBarcode && $strRef === $uBarcode) || ($uSerial && $strRef === $uSerial)) {
                    $containsThisUnit = true;
                    break;
                }
            }

            if ($containsThisUnit) {
                $affectedTypeIds[] = (int)$parent->equipment_type_id;

                // Inspect ALL child components for this parent
                $childIds   = array_values(array_filter($rawList, fn($v) => is_numeric($v) && (int)$v > 0));
                $childCodes = array_values(array_filter($rawList, fn($v) => !empty($v)));

                $allSiblings = EquipmentUnit::where(function($q) use ($childCodes, $childIds) {
                    $q->whereIn('barcode', $childCodes);
                    if (!empty($childIds)) {
                        $q->orWhereIn('id', array_map('intval', $childIds));
                    }
                })->whereNull('archived_at')->get();

                $allSiblingsGood = true;
                foreach ($allSiblings as $sib) {
                    $affectedTypeIds[] = (int)$sib->equipment_type_id;
                    $sibCond = strtolower(trim($sib->condition ?? 'good'));
                    $sibStat = strtolower(trim($sib->status ?? 'available'));
                    if (in_array($sibCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                        || in_array($sibStat, ['damaged', 'lost', 'decommissioned', 'maintenance'], true)) {
                        $allSiblingsGood = false;
                    }
                }

                $parentCond = strtolower(trim($parent->condition ?? 'good'));
                $parentStat = strtolower(trim($parent->status ?? 'available'));
                $parentIsDamaged = in_array($parentCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true);

                if ($allSiblingsGood && !$parentIsDamaged) {
                    // All children and parent are Good -> parent is available, child units are built-in!
                    if (!in_array($parentStat, ['released', 'in_use', 'reserved'], true)) {
                        $parent->update(['status' => 'available']);
                    }
                    foreach ($allSiblings as $sib) {
                        $sCond = strtolower(trim($sib->condition ?? 'good'));
                        $sStat = strtolower(trim($sib->status ?? 'available'));
                        if (!in_array($sCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                            && !in_array($sStat, ['released', 'in_use', 'reserved'], true)) {
                            $sib->update(['status' => 'built-in']);
                        }
                    }
                } else {
                    // One or more built-in units (or parent) is damaged or lost:
                    // Set parent status to unavailable
                    if (!$parentIsDamaged && !in_array($parentStat, ['released', 'in_use', 'reserved'], true)) {
                        $parent->update(['status' => 'unavailable']);
                    }
                    // Together with the other built-in units that belong to the unit: set status unavailable!
                    foreach ($allSiblings as $sib) {
                        $sCond = strtolower(trim($sib->condition ?? 'good'));
                        $sStat = strtolower(trim($sib->status ?? 'available'));
                        if (!in_array($sCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                            && !in_array($sStat, ['released', 'in_use', 'reserved'], true)) {
                            $sib->update(['status' => 'unavailable']);
                        }
                    }
                }
            }
        }

        // ── 2. If $unit itself is a parent unit (has built_in_units) ─────────
        $currentBuiltIn = is_array($unit->built_in_units)
            ? $unit->built_in_units
            : (is_string($unit->built_in_units) ? json_decode($unit->built_in_units, true) : []);

        if (is_array($currentBuiltIn) && !empty($currentBuiltIn)) {
            $childIds   = array_values(array_filter($currentBuiltIn, fn($v) => is_numeric($v) && (int)$v > 0));
            $childCodes = array_values(array_filter($currentBuiltIn, fn($v) => !empty($v)));

            $currentChildren = EquipmentUnit::where(function($q) use ($childCodes, $childIds) {
                $q->whereIn('barcode', $childCodes);
                if (!empty($childIds)) {
                    $q->orWhereIn('id', array_map('intval', $childIds));
                }
            })->whereNull('archived_at')->get();

            $allChildrenGood = true;
            foreach ($currentChildren as $child) {
                $affectedTypeIds[] = (int)$child->equipment_type_id;
                $cCond = strtolower(trim($child->condition ?? 'good'));
                $cStat = strtolower(trim($child->status ?? 'available'));
                if (in_array($cCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                    || in_array($cStat, ['damaged', 'lost', 'decommissioned', 'maintenance'], true)) {
                    $allChildrenGood = false;
                }
            }

            $uCond = strtolower(trim($unit->condition ?? 'good'));
            $uStat = strtolower(trim($unit->status ?? 'available'));
            $uIsDamaged = in_array($uCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true);

            if ($allChildrenGood && !$uIsDamaged) {
                // Parent and all children are Good -> parent is available, children are built-in!
                if (!in_array($uStat, ['released', 'in_use', 'reserved'], true)) {
                    $unit->update(['status' => 'available']);
                }
                foreach ($currentChildren as $child) {
                    $cCond = strtolower(trim($child->condition ?? 'good'));
                    $cStat = strtolower(trim($child->status ?? 'available'));
                    if (!in_array($cCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                        && !in_array($cStat, ['released', 'in_use', 'reserved'], true)) {
                        $child->update(['status' => 'built-in']);
                    }
                }
            } else {
                // One or more built-in units (or parent) is damaged/lost:
                // Set parent to unavailable
                if (!$uIsDamaged && !in_array($uStat, ['released', 'in_use', 'reserved'], true)) {
                    $unit->update(['status' => 'unavailable']);
                }
                // Together with the other built-in units that belong to the unit: set status unavailable!
                foreach ($currentChildren as $child) {
                    $cCond = strtolower(trim($child->condition ?? 'good'));
                    $cStat = strtolower(trim($child->status ?? 'available'));
                    if (!in_array($cCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                        && !in_array($cStat, ['released', 'in_use', 'reserved'], true)) {
                        $child->update(['status' => 'unavailable']);
                    }
                }
            }
        }

        // ── 3. If child units were replaced / removed ────────────────────────
        if (is_array($oldBuiltInRefs) && !empty($oldBuiltInRefs)) {
            $newRefs = is_array($currentBuiltIn) ? $currentBuiltIn : [];
            $removedRefs = array_diff($oldBuiltInRefs, $newRefs);

            if (!empty($removedRefs)) {
                $remIds   = array_values(array_filter($removedRefs, fn($v) => is_numeric($v) && (int)$v > 0));
                $remCodes = array_values(array_filter($removedRefs, fn($v) => !empty($v)));

                $removedUnits = EquipmentUnit::where(function($q) use ($remCodes, $remIds) {
                    $q->whereIn('barcode', $remCodes);
                    if (!empty($remIds)) {
                        $q->orWhereIn('id', array_map('intval', $remIds));
                    }
                })->whereNull('archived_at')->get();

                foreach ($removedUnits as $remUnit) {
                    $affectedTypeIds[] = (int)$remUnit->equipment_type_id;
                    $remCond = strtolower(trim($remUnit->condition ?? 'good'));
                    if (!in_array($remCond, ['damaged', 'lost', 'decommissioned'], true) && $remUnit->status === 'unavailable') {
                        $remUnit->update(['status' => 'available']);
                    }
                }
            }
        }

        // Re-sync all affected categories
        $uniqueTypeIds = array_unique(array_filter($affectedTypeIds));
        foreach ($uniqueTypeIds as $tId) {
            $this->syncCategoryStock($tId);
        }

        // Broadcast inventory update event
        try {
            event(new \App\Events\InventoryStockUpdated(null, 'updated', ['unit_id' => $unit->id]));
        } catch (\Throwable $e) {}

        return $uniqueTypeIds;
    }

    /**
     * Helper to dynamically calculate and update EquipmentType stock counts.
     *
     * Columns managed:
     *   total_quantity   – all non-archived units of this category
     *   built_in_count   – units of this category that are child components of another unit
     *   unavailable_count– parent units (has built_in_units) whose kit has ≥1 damaged/lost child
     *   available_count  – truly free units (not built-in, not unavailable, not reserved/released/damaged/lost)
     *   reserved_count   – units with status = 'reserved'
     *   released_count   – units with status = 'released'/'in_use'
     *   damaged_count    – units with condition = 'Damaged' (and not lost)
     *   lost_count       – units with condition = 'Lost'
     */
    public function syncCategoryStock(int $typeId): void
    {
        try {
            $type = EquipmentType::find($typeId);
            if (!$type) return;

            // ── 1. All non-archived units for this category ──────────────────────
            $categoryUnits = EquipmentUnit::where('equipment_type_id', $typeId)
                ->whereNull('archived_at')
                ->get();

            if ($categoryUnits->isEmpty()) {
                $type->update([
                    'total_quantity'   => 0,
                    'available_count'  => 0,
                    'built_in_count'   => 0,
                    'unavailable_count'=> 0,
                    'reserved_count'   => 0,
                    'released_count'   => 0,
                    'damaged_count'    => 0,
                    'lost_count'       => 0,
                ]);
                return;
            }

            $totalUnits = $categoryUnits->count();
            $categoryUnitIds = $categoryUnits->pluck('id')->map(fn($id) => (string)$id)->toArray();

            // ── 2. Identify all child unit IDs system-wide ──────────────────────
            // A child is any unit whose ID appears in another unit's built_in_units JSON array.
            $allParentUnits = EquipmentUnit::whereNotNull('built_in_units')
                ->whereNull('archived_at')
                ->get(['id', 'built_in_units', 'status', 'condition', 'equipment_type_id']);

            $globalChildIds = [];  // string IDs of all child units system-wide
            foreach ($allParentUnits as $parent) {
                $builtIn = is_array($parent->built_in_units)
                    ? $parent->built_in_units
                    : (is_string($parent->built_in_units) ? json_decode($parent->built_in_units, true) : []);
                if (is_array($builtIn)) {
                    foreach ($builtIn as $childRef) {
                        if (!empty($childRef)) {
                            $globalChildIds[] = (string)$childRef;
                        }
                    }
                }
            }
            $globalChildIds = array_unique($globalChildIds);

            // ── 3. Categorize each unit in this category ─────────────────────────
            // Columns: total = available + built_in + unavailable + reserved + released + damaged + lost
            $builtInCount     = 0;
            $unavailableCount = 0;
            $reservedCount    = 0;
            $releasedCount    = 0;
            $damagedCount     = 0;
            $lostCount        = 0;
            $availableCount   = 0;

            foreach ($categoryUnits as $unit) {
                $statusLower = strtolower(trim($unit->status ?? 'available'));
                $condLower   = strtolower(trim($unit->condition ?? 'good'));
                $uid         = (string)$unit->id;
                $uBarcode    = (string)($unit->barcode ?: '');
                $isChild     = in_array($uid, $globalChildIds, true) || ($uBarcode && in_array($uBarcode, $globalChildIds, true));

                // Lost takes highest priority
                if (in_array($condLower, ['lost', 'decommissioned'], true) || in_array($statusLower, ['lost', 'decommissioned'], true)) {
                    $lostCount++;
                    continue;
                }

                // Damaged (not lost)
                if (
                    in_array($condLower, ['damaged', 'under repair', 'under_repair', 'worn', 'minor wear'], true) ||
                    in_array($statusLower, ['damaged', 'maintenance', 'under_maintenance'], true)
                ) {
                    $damagedCount++;
                    continue;
                }

                // If unit was released/in use
                if (in_array($statusLower, ['released', 'in_use', 'in-use', 'borrowed'], true)) {
                    $releasedCount++;
                    continue;
                }

                // If unit is reserved
                if ($statusLower === 'reserved') {
                    $reservedCount++;
                    continue;
                }

                // If unit status is unavailable (either parent kit or child unit whose kit has a broken component)
                if ($statusLower === 'unavailable') {
                    $unavailableCount++;
                    continue;
                }

                // If unit is a built-in child inside another kit (healthy and available with parent)
                if ($isChild) {
                    $builtInCount++;
                    continue;
                }

                // For parent kits / standalone units:
                // Check if this parent has built-in units and if any child is damaged or lost
                $builtIn = is_array($unit->built_in_units)
                    ? $unit->built_in_units
                    : (is_string($unit->built_in_units) ? json_decode($unit->built_in_units, true) : []);

                $hasDamagedOrLostChild = false;
                if (is_array($builtIn) && !empty($builtIn)) {
                    $childIds   = array_values(array_filter($builtIn, fn($v) => is_numeric($v) && (int)$v > 0));
                    $childCodes = array_values(array_filter($builtIn, fn($v) => !empty($v)));

                    $children = EquipmentUnit::where(function($q) use ($childCodes, $childIds) {
                        $q->whereIn('barcode', $childCodes);
                        if (!empty($childIds)) {
                            $q->orWhereIn('id', array_map('intval', $childIds));
                        }
                    })
                    ->whereNull('archived_at')
                    ->get();

                    $hasDamagedOrLostChild = $children->contains(function($child) {
                        $cCond = strtolower(trim($child->condition ?? 'good'));
                        $cStat = strtolower(trim($child->status ?? 'available'));
                        return in_array($cCond, ['damaged', 'lost', 'decommissioned', 'under repair', 'worn', 'minor wear'], true)
                            || in_array($cStat, ['damaged', 'lost', 'decommissioned', 'maintenance', 'unavailable'], true);
                    });
                }

                if ($hasDamagedOrLostChild) {
                    $unavailableCount++;
                } else {
                    $availableCount++;
                }
            }

            $updateData = [
                'total_quantity'  => $totalUnits,
                'available_count' => $availableCount,
                'released_count'  => $releasedCount,
                'damaged_count'   => $damagedCount,
                'lost_count'      => $lostCount,
            ];

            // Only update new columns if they exist in the schema
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_types', 'built_in_count')) {
                $updateData['built_in_count'] = $builtInCount;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_types', 'unavailable_count')) {
                $updateData['unavailable_count'] = $unavailableCount;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_types', 'reserved_count')) {
                $updateData['reserved_count'] = $reservedCount;
            }

            $type->update($updateData);

        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\Log::warning("Failed to sync category stock for type {$typeId}: " . $th->getMessage());
        }
    }
}
