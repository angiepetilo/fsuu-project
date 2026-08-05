<?php

namespace App\Http\Controllers;

use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminEquipmentUnitController extends Controller
{
    /**
     * Display a listing of all physical equipment units.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            EquipmentUnit::with('equipmentType.office')->latest()->get()
        );
    }

    /**
     * Store a newly created physical equipment unit and update category stock count.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'name'              => 'required|string|max:255',
            'unit_code'         => 'required|string|max:255|unique:equipment_units,unit_code',
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'description'       => 'nullable|string',
        ]);

        $unit = EquipmentUnit::create([
            'equipment_type_id' => $validated['equipment_type_id'],
            'name'              => $validated['name'],
            'unit_code'         => $validated['unit_code'],
            'purchased_at'      => $validated['purchased_at'] ?? now()->toDateString(),
            'eq_lifespan'       => $validated['eq_lifespan'] ?? 5,
            'status'            => $validated['status'] ?? 'available',
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
        $unit = EquipmentUnit::findOrFail($id);

        $validated = $request->validate([
            'equipment_type_id' => 'sometimes|exists:equipment_types,id',
            'name'              => 'sometimes|string|max:255',
            'unit_code'         => ['sometimes', 'string', 'max:255', Rule::unique('equipment_units', 'unit_code')->ignore($unit->id)],
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'description'       => 'nullable|string',
        ]);

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
    public function destroy(int $id): JsonResponse
    {
        $unit = EquipmentUnit::findOrFail($id);
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
            ->count();

        $type->update([
            'total_quantity'  => $totalUnits,
            'available_count' => $availableUnits,
        ]);
    }
}
