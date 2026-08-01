<?php

namespace App\Http\Controllers;

use App\Models\EquipmentType;
use App\Models\Office;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEquipmentTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $types = EquipmentType::with('office')
            ->withCount([
                'equipmentUnits as calculated_total' => function ($q) {
                    $q->whereNull('archived_at');
                },
                'equipmentUnits as calculated_available' => function ($q) {
                    $q->whereNull('archived_at')->where('status', 'available');
                }
            ])
            ->latest()
            ->get()
            ->map(fn ($e) => [
                'id'              => $e->id,
                'office_id'       => $e->office_id,
                'eq_name'         => $e->eq_name,
                'eq_type'         => $e->eq_type,
                'barcode'         => $e->barcode,
                'avatar'          => $e->avatar,
                'total_quantity'  => (int) $e->calculated_total,
                'available_count' => (int) $e->calculated_available,
                'date_purchased'  => $e->date_purchased,
                'lifespan_years'  => $e->lifespan_years ?? 5,
                'status'          => $e->status ?? 'available',
                'description'     => $e->description,
                'office'          => $e->office,
                'created_at'      => $e->created_at,
            ]);

        return response()->json($types);
    }

    public function store(Request $request): JsonResponse
    {
        $input = array_map(fn ($v) => $v === '' ? null : $v, $request->all());

        $data = validator($input, [
            'office_id'       => 'nullable|exists:offices,id',
            'eq_name'         => 'required|string|max:255',
            'eq_type'         => 'nullable|string|max:255',
            'barcode'         => 'nullable|string|max:100',
            'avatar'          => 'nullable|string',
            'total_quantity'  => 'nullable|integer|min:0',
            'available_count' => 'nullable|integer|min:0',
            'date_purchased'  => 'nullable|date',
            'lifespan_years'  => 'nullable|integer|min:1',
            'status'          => 'nullable|in:available,maintenance,decommissioned',
            'description'     => 'nullable|string|max:500',
        ])->validate();

        if (empty($data['office_id'])) {
            $office = Office::first() ?? Office::create(['name' => 'FSUU Main Campus AVR Office', 'slug' => 'fsuu-main-campus-avr-office']);
            $data['office_id'] = $office->id;
        }

        $data['total_quantity'] = 0;
        $data['available_count'] = 0;

        $type = new EquipmentType();
        $type->forceFill($data)->save();

        return response()->json($type->load('office'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);

        $input = array_map(fn ($v) => $v === '' ? null : $v, $request->all());

        $data = validator($input, [
            'office_id'       => 'nullable|exists:offices,id',
            'eq_name'         => 'sometimes|string|max:255',
            'eq_type'         => 'nullable|string|max:255',
            'barcode'         => 'nullable|string|max:100',
            'avatar'          => 'nullable|string',
            'total_quantity'  => 'nullable|integer|min:0',
            'available_count' => 'nullable|integer|min:0',
            'date_purchased'  => 'nullable|date',
            'lifespan_years'  => 'nullable|integer|min:1',
            'status'          => 'nullable|in:available,maintenance,decommissioned',
            'description'     => 'nullable|string|max:500',
        ])->validate();

        if (empty($data['office_id'])) {
            $office = Office::first() ?? Office::create(['name' => 'FSUU Main Campus AVR Office', 'slug' => 'fsuu-main-campus-avr-office']);
            $data['office_id'] = $type->office_id ?: $office->id;
        }

        $type->forceFill($data)->save();

        return response()->json($type->load('office'));
    }

    public function destroy(int $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);
        $type->delete();

        return response()->json(['message' => 'Equipment type archived (soft-deleted)']);
    }
}
