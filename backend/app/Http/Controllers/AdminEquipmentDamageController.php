<?php

namespace App\Http\Controllers;

use App\Models\EquipmentUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminEquipmentDamageController extends Controller
{
    public function index(): JsonResponse
    {
        $damagedUnits = EquipmentUnit::with('equipmentType')
            ->whereIn('status', ['damaged', 'under_maintenance'])
            ->latest()
            ->get();

        $damagedInspections = DB::table('inspections')
            ->where('condition', 'damaged')
            ->latest()
            ->get();

        return response()->json([
            'total_damaged_count' => $damagedUnits->count() + $damagedInspections->count(),
            'damaged_units'       => $damagedUnits,
            'damaged_inspections' => $damagedInspections,
        ]);
    }
}
