<?php

namespace App\Http\Controllers;

use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use App\Enums\UnitStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AvrEquipmentUnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = EquipmentUnit::with(['equipmentType', 'borrowingUnit'])
            ->when($request->type_id, fn($q) => $q->where('equipment_type_id', $request->type_id))
            ->when($request->status,  fn($q) => $q->where('unit_status', $request->status))
            ->when($request->search,  fn($q) => $q->where('barcode', 'like', '%' . $request->search . '%'));

        $units = $query->latest()->paginate(25);

        // Enrich with age calculation
        $units->getCollection()->transform(function ($unit) {
            $purchasedDate = $unit->purchased_date ? Carbon::parse($unit->purchased_date) : null;
            $unit->age_years = $purchasedDate ? $purchasedDate->diffInYears(now()) : null;
            $unit->updated_by_user = $unit->updater;
            if ($unit->image_path) {
                $unit->image_url = url('storage/' . $unit->image_path);
            }
            return $unit;
        });

        return response()->json($units);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'barcode'           => 'required|string|unique:equipment_units,barcode',
            'brand_model'       => 'nullable|string',
            'unit_status'       => 'nullable|in:available,checked_out,damaged,under_repair,lost',
            'unit_status_notes' => 'nullable|string',
            'purchased_date'    => 'nullable|date',
            'lifespan_years'    => 'nullable|integer',
            'image'             => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('equipment_units', 'public');
        }

        $data['unit_status']  = $data['unit_status'] ?? 'available';
        $data['updated_by']   = auth()->id();

        $unit = EquipmentUnit::create($data);
        $unit->load('equipmentType');

        return response()->json($unit, 201);
    }

    public function update(Request $request, EquipmentUnit $unit): JsonResponse
    {
        $data = $request->validate([
            'equipment_type_id' => 'sometimes|exists:equipment_types,id',
            'barcode'           => 'sometimes|string|unique:equipment_units,barcode,' . $unit->id,
            'brand_model'       => 'nullable|string',
            'unit_status'       => 'sometimes|in:available,checked_out,damaged,under_repair,lost',
            'unit_status_notes' => 'nullable|string',
            'purchased_date'    => 'nullable|date',
            'lifespan_years'    => 'nullable|integer',
            'image'             => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('equipment_units', 'public');
        }

        $data['updated_by'] = auth()->id();
        $unit->update($data);
        $unit->load('equipmentType');

        return response()->json($unit);
    }

    public function destroy(EquipmentUnit $unit): JsonResponse
    {
        $unit->delete();
        return response()->json(['message' => 'Unit deleted.']);
    }
}
