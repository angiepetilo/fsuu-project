<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EquipmentUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EquipmentDamageController extends Controller
{
    public function index(): JsonResponse
    {
        // Physical equipment units currently marked as damaged / lost / under maintenance
        $issuesQuery = EquipmentUnit::with('equipmentType')
            ->where(function($q) {
                $q->whereIn('status', ['damaged', 'under_maintenance', 'lost'])
                  ->orWhereIn(DB::raw('LOWER(equipment_units.condition)'), ['damaged', 'lost']);
            });

        $allIssues = $issuesQuery->latest()->get();

        $damagedUnits = $allIssues->filter(function($u) {
            return in_array(strtolower($u->status), ['damaged', 'under_maintenance']) || strtolower($u->condition) === 'damaged';
        });

        $lostUnits = $allIssues->filter(function($u) {
            return strtolower($u->status) === 'lost' || strtolower($u->condition) === 'lost';
        });

        // Inspection records with condition = 'damaged' or 'lost'
        // Only count inspections that are NOT from already-returned / archived borrows
        // so historical damage records don't inflate the current count.
        $damagedInspections = collect();
        $lostInspections    = collect();

        try {
            if (Schema::hasTable('inspections') && Schema::hasTable('equipment_borrows')) {
                // Active borrow IDs: borrows that are still on-going / approved (not archived / returned)
                $activeBorrowQuery = DB::table('equipment_borrows')
                    ->whereNull('equipment_borrows.archived_at')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('tracking_numbers.archived_at')
                    ->whereNotIn(DB::raw('LOWER(tracking_numbers.status)'), ['returned', 'completed', 'cancelled', 'rejected']);

                $activeBorrowIds = $activeBorrowQuery->pluck('equipment_borrows.id');

                $activeInspections = DB::table('inspections')
                    ->where(function($q) {
                        $q->where('inspectable_type', 'like', '%EquipmentBorrow%')
                          ->orWhere('inspectable_type', 'equipment_borrow')
                          ->orWhere('reference_type', 'equipment_borrow');
                    })
                    ->where(function($q) use ($activeBorrowIds) {
                        $q->whereIn('inspectable_id', $activeBorrowIds)
                          ->orWhereIn('reference_id', $activeBorrowIds);
                    })
                    ->whereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost'])
                    ->latest()
                    ->get();

                $damagedInspections = $activeInspections->filter(fn($i) => strtolower($i->condition) === 'damaged');
                $lostInspections    = $activeInspections->filter(fn($i) => strtolower($i->condition) === 'lost');
            }
        } catch (\Throwable $th) {
            // silently fallback to physical units only
        }

        return response()->json([
            'total_damaged_count' => $damagedUnits->count(),
            'total_lost_count'    => $lostUnits->count(),
            'damaged_units'       => $damagedUnits,
            'damaged_inspections' => $damagedInspections->values(),
        ]);
    }
}
