<?php

namespace App\Http\Controllers;

use App\Models\EquipmentUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminEquipmentDamageController extends Controller
{
    public function index(): JsonResponse
    {
        // Physical equipment units currently marked as damaged / under maintenance
        $damagedUnits = EquipmentUnit::with('equipmentType')
            ->whereIn('status', ['damaged', 'under_maintenance'])
            ->latest()
            ->get();

        // Inspection records with condition = 'damaged' or 'lost'
        // Only count inspections that are NOT from already-returned / archived borrows
        // so historical damage records don't inflate the current count.
        $damagedInspections = collect();
        $lostInspections    = collect();

        try {
            if (Schema::hasTable('inspections') && Schema::hasTable('equipment_borrows')) {
                // Active borrow IDs: borrows that are still on-going / approved (not archived / returned)
                $activeBorrowIds = DB::table('equipment_borrows')
                    ->whereNull('archived_at')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNotIn(DB::raw('LOWER(tracking_numbers.status)'), ['returned', 'completed', 'cancelled', 'rejected'])
                    ->pluck('equipment_borrows.id');

                $activeInspections = DB::table('inspections')
                    ->where('inspectable_type', 'like', '%EquipmentBorrow%')
                    ->whereIn('inspectable_id', $activeBorrowIds)
                    ->whereIn('condition', ['damaged', 'lost'])
                    ->latest()
                    ->get();

                $damagedInspections = $activeInspections->where('condition', 'damaged');
                $lostInspections    = $activeInspections->where('condition', 'lost');
            }
        } catch (\Throwable $th) {
            // silently fallback to physical units only
        }

        return response()->json([
            'total_damaged_count' => $damagedUnits->count() + $damagedInspections->count(),
            'total_lost_count'    => $lostInspections->count(),
            'damaged_units'       => $damagedUnits,
            'damaged_inspections' => $damagedInspections->values(),
        ]);
    }
}
