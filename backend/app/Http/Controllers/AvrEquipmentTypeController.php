<?php

namespace App\Http\Controllers;

use App\Models\EquipmentType;
use App\Models\Office;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvrEquipmentTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $types = EquipmentType::with(['office', 'units'])
            ->withCount([
                'units',
                'units as available_count' => fn($q) => $q->where('unit_status', 'available'),
                'units as damaged_count'   => fn($q) => $q->where('unit_status', 'damaged'),
                'units as checked_out_count' => fn($q) => $q->where('unit_status', 'checked_out'),
            ])
            ->when($request->search, fn($q) => $q->where('name', 'like', '%' . $request->search . '%'))
            ->paginate(15);

        // Transform data to append image URL
        $types->getCollection()->transform(function ($type) {
            if ($type->image_path) {
                $type->image_url = url('storage/' . $type->image_path);
            }
            return $type;
        });

        return response()->json($types);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'office_id'      => 'nullable|exists:offices,id',
            'is_active'      => 'boolean',
            'purchased_date' => 'nullable|date',
            'lifespan_years' => 'nullable|integer|min:1',
            'image'          => 'nullable|image|max:2048',
        ]);

        $data['is_active'] = $data['is_active'] ?? true;
        
        if (empty($data['office_id'])) {
            $avrOffice = Office::where('type', 'avr')->first();
            $data['office_id'] = $avrOffice?->id;
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('equipment_types', 'public');
        }

        $type = EquipmentType::create($data);

        return response()->json($type, 201);
    }

    public function update(Request $request, EquipmentType $type): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'description'    => 'nullable|string',
            'office_id'      => 'nullable|exists:offices,id',
            'is_active'      => 'boolean',
            'purchased_date' => 'nullable|date',
            'lifespan_years' => 'nullable|integer|min:1',
            'image'          => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('equipment_types', 'public');
        }

        $type->update($data);
        return response()->json($type);
    }

    public function destroy(EquipmentType $type): JsonResponse
    {
        if ($type->units()->count() > 0) {
            return response()->json(['message' => 'Cannot delete category with existing units.'], 422);
        }
        $type->delete();
        return response()->json(['message' => 'Category deleted.']);
    }
}
