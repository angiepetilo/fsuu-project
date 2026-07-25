<?php

namespace App\Http\Controllers;

use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AvrInventoryController extends Controller
{
    public function index(): JsonResponse
    {
        $types = EquipmentType::with(['office'])
            ->withCount([
                'units as total_units',
                'units as available_count'    => fn($q) => $q->where('unit_status', 'available'),
                'units as checked_out_count'  => fn($q) => $q->where('unit_status', 'checked_out'),
                'units as damaged_count'       => fn($q) => $q->where('unit_status', 'damaged'),
                'units as under_repair_count'  => fn($q) => $q->where('unit_status', 'under_repair'),
                'units as lost_count'          => fn($q) => $q->where('unit_status', 'lost'),
            ])
            ->get()
            ->map(function ($type) {
                // Get the most recently updated unit and who updated it
                $lastUpdatedUnit = EquipmentUnit::where('equipment_type_id', $type->id)
                    ->whereNotNull('updated_by')
                    ->latest('updated_at')
                    ->first();

                $updater = null;
                if ($lastUpdatedUnit && $lastUpdatedUnit->updated_by) {
                    $u = User::find($lastUpdatedUnit->updated_by);
                    $updater = $u ? ['id' => $u->id, 'name' => $u->name] : null;
                }

                return [
                    'id'               => $type->id,
                    'name'             => $type->name,
                    'description'      => $type->description,
                    'office'           => $type->office?->only(['id', 'name', 'code']),
                    'purchased_date'   => $type->purchased_date,
                    'lifespan_years'   => $type->lifespan_years,
                    'total_units'      => $type->total_units,
                    'available_count'  => $type->available_count,
                    'checked_out_count'=> $type->checked_out_count,
                    'damaged_count'    => $type->damaged_count,
                    'under_repair_count' => $type->under_repair_count,
                    'lost_count'       => $type->lost_count,
                    'updated_by'       => $updater,
                    'last_updated_at'  => $lastUpdatedUnit?->updated_at?->toIso8601String(),
                ];
            });

        $summary = [
            'total_units'     => $types->sum('total_units'),
            'available'       => $types->sum('available_count'),
            'checked_out'     => $types->sum('checked_out_count'),
            'damaged'         => $types->sum('damaged_count'),
            'under_repair'    => $types->sum('under_repair_count'),
            'lost'            => $types->sum('lost_count'),
        ];

        return response()->json([
            'summary'     => $summary,
            'categories'  => $types,
        ]);
    }
}
