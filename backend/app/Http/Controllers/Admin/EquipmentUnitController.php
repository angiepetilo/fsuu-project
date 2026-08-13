<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EquipmentUnitController extends Controller
{
    /**
     * Display a listing of all physical equipment units.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        $query = EquipmentUnit::with('equipmentType.office')
            ->whereNull('equipment_units.archived_at');

        if (!$isSuperAdmin && $officeId) {
            $query->whereHas('equipmentType', function ($q) use ($officeId) {
                $q->where('office_id', $officeId);
            });
        }

        return response()->json($query->latest()->get());
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
            'condition'         => 'nullable|string|max:100',
            'description'       => 'nullable|string',
        ]);

        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        $targetCategory = EquipmentType::findOrFail($validated['equipment_type_id']);
        if (!$isSuperAdmin && $officeId && (int)$targetCategory->office_id !== (int)$officeId) {
            return response()->json([
                'message' => 'Cannot create equipment units under a category belonging to a different campus/office.',
                'errors'  => [
                    'equipment_type_id' => ['Cross-office unit creation is not permitted.']
                ]
            ], 403);
        }

        $rawCondition = $request->input('condition', 'Good');
        $canonicalCondition = match(strtolower(trim($rawCondition))) {
            'damaged' => 'Damaged',
            'lost' => 'Lost',
            'under repair', 'under_repair' => 'Under Repair',
            default => 'Good',
        };

        $unit = EquipmentUnit::create([
            'equipment_type_id' => $validated['equipment_type_id'],
            'name'              => $validated['name'],
            'unit_code'         => $validated['unit_code'],
            'purchased_at'      => $validated['purchased_at'] ?? now()->toDateString(),
            'eq_lifespan'       => $validated['eq_lifespan'] ?? 5,
            'status'            => $validated['status'] ?? 'available',
            'condition'         => $canonicalCondition,
            'description'       => $validated['description'] ?? null,
        ]);

        // Sync category stock count
        $this->syncCategoryStock($unit->equipment_type_id);

        return response()->json($unit->load('equipmentType.office'), 201);
    }

    /**
     * Update the specified physical equipment unit.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::with('equipmentType')->findOrFail($id);

        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        if (!$isSuperAdmin && $officeId && $unit->equipmentType && (int)$unit->equipmentType->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to modify equipment units from another office.'], 403);
        }

        $validated = $request->validate([
            'equipment_type_id' => 'sometimes|exists:equipment_types,id',
            'name'              => 'sometimes|string|max:255',
            'unit_code'         => ['sometimes', 'string', 'max:255', Rule::unique('equipment_units', 'unit_code')->ignore($unit->id)],
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'description'       => 'nullable|string',
        ]);

        if (isset($validated['equipment_type_id']) && !$isSuperAdmin && $officeId) {
            $newCat = EquipmentType::findOrFail($validated['equipment_type_id']);
            if ((int)$newCat->office_id !== (int)$officeId) {
                return response()->json(['message' => 'Cannot transfer equipment units to another office.'], 403);
            }
        }

        if (isset($validated['condition'])) {
            $validated['condition'] = match(strtolower(trim($validated['condition']))) {
                'damaged' => 'Damaged',
                'lost' => 'Lost',
                'under repair', 'under_repair' => 'Under Repair',
                default => 'Good',
            };
        }

        $oldTypeId = $unit->equipment_type_id;

        $unit->update($validated);

        // Sync category stock counts for old and new category
        $this->syncCategoryStock($oldTypeId);
        if ($unit->equipment_type_id !== $oldTypeId) {
            $this->syncCategoryStock($unit->equipment_type_id);
        }

        return response()->json($unit->load('equipmentType.office'));
    }

    /**
     * Soft-delete physical equipment unit and decrement category stock.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::with('equipmentType')->findOrFail($id);

        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        if (!$isSuperAdmin && $officeId && $unit->equipmentType && (int)$unit->equipmentType->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to archive equipment units from another office.'], 403);
        }

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
