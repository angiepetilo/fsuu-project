<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DepartmentAnalyticsController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : true;
        $officeId = $user ? $user->office_id : null;

        // 1. Real Venue Violations & Damages
        $venueQuery = DB::table('inspections')
            ->join('venue_bookings', 'inspections.inspectable_id', '=', 'venue_bookings.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->where(function($q) {
                $q->where('inspections.inspectable_type', \App\Models\VenueBooking::class)
                  ->orWhere('inspections.inspectable_type', 'venue_booking')
                  ->orWhere('inspections.reference_type', 'venue_booking');
            })
            ->where(function($q) {
                $q->where(DB::raw('LOWER(inspections.`condition`)'), 'damaged')
                  ->orWhere('inspections.is_late', true)
                  ->orWhereNotNull('inspections.violation_type');
            });

        if (!$isSuperAdmin && $officeId) {
            $venueQuery->where('venues.office_id', $officeId);
        }

        $venueViolations = $venueQuery
            ->select('venue_bookings.program_office', DB::raw('count(*) as count'))
            ->groupBy('venue_bookings.program_office')
            ->get()
            ->keyBy('program_office');

        // 2. Real Equipment Violations & Damages
        $equipQuery = DB::table('inspections')
            ->join('equipment_borrows', 'inspections.inspectable_id', '=', 'equipment_borrows.id')
            ->where(function($q) {
                $q->where('inspections.inspectable_type', \App\Models\EquipmentBorrow::class)
                  ->orWhere('inspections.inspectable_type', 'equipment_borrow')
                  ->orWhere('inspections.reference_type', 'equipment_borrow');
            })
            ->where(function($q) {
                $q->whereIn(DB::raw('LOWER(inspections.`condition`)'), ['damaged', 'lost'])
                  ->orWhereNotNull('inspections.violation_type');
            });

        if (!$isSuperAdmin && $officeId) {
            $equipQuery->where('equipment_borrows.office_id', $officeId);
        }

        $equipViolations = $equipQuery
            ->select('equipment_borrows.program_office', DB::raw('count(*) as count'))
            ->groupBy('equipment_borrows.program_office')
            ->get()
            ->keyBy('program_office');

        // 3. Real Late Returns (Borrows & Bookings)
        $lateQuery = DB::table('inspections')
            ->leftJoin('venue_bookings', function($j) {
                $j->on('inspections.inspectable_id', '=', 'venue_bookings.id')
                  ->where(function($q) {
                      $q->where('inspections.inspectable_type', \App\Models\VenueBooking::class)
                        ->orWhere('inspections.inspectable_type', 'venue_booking');
                  });
            })
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->leftJoin('equipment_borrows', function($j) {
                $j->on('inspections.inspectable_id', '=', 'equipment_borrows.id')
                  ->where(function($q) {
                      $q->where('inspections.inspectable_type', \App\Models\EquipmentBorrow::class)
                        ->orWhere('inspections.inspectable_type', 'equipment_borrow');
                  });
            })
            ->where(function($q) {
                $q->where('inspections.is_late', true)
                  ->orWhere('inspections.timeliness', 'late');
            });

        if (!$isSuperAdmin && $officeId) {
            $lateQuery->where(function($q) use ($officeId) {
                $q->where('equipment_borrows.office_id', $officeId)
                  ->orWhere('venues.office_id', $officeId);
            });
        }

        $lateRecords = $lateQuery
            ->select(
                DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General') as program_office"),
                DB::raw('count(*) as total_late_returns'),
                DB::raw('COALESCE(AVG(inspections.minutes_late), 0) as avg_minutes_late')
            )
            ->groupBy(DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General')"))
            ->get();

        // Combine all distinct departments
        $allDepts = $venueViolations->keys()
            ->merge($equipViolations->keys())
            ->merge($lateRecords->pluck('program_office'))
            ->filter()
            ->unique();

        $violationsList = [];
        foreach ($allDepts as $dept) {
            $vCount = $venueViolations->has($dept) ? (int)$venueViolations[$dept]->count : 0;
            $eCount = $equipViolations->has($dept) ? (int)$equipViolations[$dept]->count : 0;
            $total = $vCount + $eCount;

            $violationsList[] = [
                'department'           => $dept,
                'venue_violations'     => $vCount,
                'equipment_violations' => $eCount,
                'total_violations'     => $total,
                'risk'                 => $total >= 5 ? 'High Risk' : ($total >= 2 ? 'Moderate' : 'Low Risk'),
            ];
        }

        // Sort descending by total violations
        usort($violationsList, fn($a, $b) => $b['total_violations'] <=> $a['total_violations']);

        $lateList = $lateRecords->map(function ($l) {
            $avgMins = round($l->avg_minutes_late);
            $delayStr = $avgMins >= 60 
                ? round($avgMins / 60, 1) . ' hrs late'
                : ($avgMins > 0 ? "{$avgMins} mins late" : 'Late');

            return [
                'department'   => $l->program_office,
                'late_returns' => (int) $l->total_late_returns,
                'avg_delay'    => $delayStr,
                'status'       => $l->total_late_returns >= 5 ? 'Critical' : ($l->total_late_returns >= 2 ? 'High Risk' : 'Moderate'),
            ];
        })->toArray();

        return response()->json([
            'rule_violations' => $violationsList,
            'late_returns'    => $lateList,
        ]);
    }
}
