<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class EquipmentUnitController extends Controller
{
    /**
     * Display a listing of all physical equipment units.
     */
    public function index(Request $request): JsonResponse
    {
        \App\Services\EquipmentCategoryService::autoSyncUnitConditions();

        $query = EquipmentUnit::with('equipmentType')
            ->whereNull('equipment_units.archived_at');

        return response()->json($query->latest()->get());
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

        // 2. Normalize barcode from aliases (unit_code, code) or generate unique fallback
        $rawBarcode = trim((string)($request->input('barcode') ?? $request->input('unit_code') ?? $request->input('code') ?? ''));
        if ($rawBarcode === '') {
            $prefix = 'BC-' . date('Ymd') . '-';
            $rand = strtoupper(bin2hex(random_bytes(3)));
            $rawBarcode = $prefix . $rand;
        }
        $request->merge(['barcode' => $rawBarcode]);

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

        $validated = $request->validate([
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'brand'             => 'nullable|string|max:255',
            'model'             => 'nullable|string|max:255',
            'barcode'           => [
                'required',
                'string',
                'max:255',
                Rule::unique('equipment_units', 'barcode'),
            ],
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'description'       => 'nullable|string',
        ], [
            'equipment_type_id.required' => 'The equipment category is required.',
            'equipment_type_id.exists'   => 'The selected equipment category does not exist.',
            'barcode.required'          => 'The barcode field is required.',
            'barcode.unique'            => 'This barcode is already assigned to another physical unit. Barcodes must be unique.',
        ]);

        $rawCondition = $request->input('condition', 'Good');
        $canonicalCondition = match(strtolower(trim((string)$rawCondition))) {
            'damaged' => 'Damaged',
            'lost' => 'Lost',
            'under repair', 'under_repair' => 'Under Repair',
            'minor wear' => 'Minor Wear',
            default => 'Good',
        };

        $unit = EquipmentUnit::create([
            'equipment_type_id' => $validated['equipment_type_id'],
            'brand'             => $validated['brand'] ?? null,
            'model'             => $validated['model'] ?? null,
            'barcode'           => trim($validated['barcode']),
            'purchased_at'      => $validated['purchased_at'] ?? now()->toDateString(),
            'eq_lifespan'       => $validated['eq_lifespan'] ?? 5,
            'status'            => $validated['status'] ?? 'available',
            'condition'         => $canonicalCondition,
            'description'       => $validated['description'] ?? null,
        ]);

        // Sync category stock count
        $this->syncCategoryStock($unit->equipment_type_id);

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
            'barcode'           => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('equipment_units', 'barcode')->ignore($unit->id),
            ],
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'description'       => 'nullable|string',
        ], [
            'barcode.unique' => 'This barcode is already assigned to another physical unit. Barcodes must be unique.',
        ]);

        if (isset($validated['condition'])) {
            $validated['condition'] = match(strtolower(trim($validated['condition']))) {
                'damaged' => 'Damaged',
                'lost' => 'Lost',
                'under repair', 'under_repair' => 'Under Repair',
                'minor wear' => 'Minor Wear',
                default => 'Good',
            };
        }

        if (isset($validated['barcode'])) {
            $validated['barcode'] = trim($validated['barcode']);
        }

        $oldTypeId = $unit->equipment_type_id;

        $unit->update($validated);

        // Sync category stock counts for old and new category
        $this->syncCategoryStock($oldTypeId);
        if ($unit->equipment_type_id !== $oldTypeId) {
            $this->syncCategoryStock($unit->equipment_type_id);
        }

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

        return response()->json(['message' => 'Equipment unit archived successfully']);
    }

    /**
     * Helper to dynamically calculate and update EquipmentType stock counts
     */
    private function syncCategoryStock(int $typeId): void
    {
        $type = EquipmentType::find($typeId);
        if (!$type) return;

        $totalUnits = EquipmentUnit::where('equipment_type_id', $typeId)->count();
        $availableUnits = EquipmentUnit::where('equipment_type_id', $typeId)
            ->where('status', 'available')
            ->whereNotIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'under repair', 'worn'])
            ->count();

        $type->update([
            'total_quantity'  => $totalUnits,
            'available_count' => $availableUnits,
        ]);
    }
}
