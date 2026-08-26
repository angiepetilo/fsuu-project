<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Services\EquipmentCategoryService;

class DashboardStatsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        return response()->json($this->getAvrStats($user));
    }

    private function getAvrStats($user)
    {
        // Auto-synchronize physical unit condition/status before computing statistics
        EquipmentCategoryService::autoSyncUnitConditions();

        $now = Carbon::now();

        $activeTerm = \App\Models\AcademicTerm::where('is_active', true)->first();
        $termId = $activeTerm ? $activeTerm->id : null;

        // Pending Bookings
        $pendingBookingsQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('venue_bookings.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending');

        if ($termId) {
            $pendingBookingsQuery->where(function($q) use ($termId) {
                $q->where('venue_bookings.academic_term_id', $termId)
                  ->orWhereNull('venue_bookings.academic_term_id');
            });
        }

        $pendingBookings = $pendingBookingsQuery->count();

        // Pending Borrowings
        $pendingBorrowingsQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending');

        if ($termId) {
            $pendingBorrowingsQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhereNull('equipment_borrows.academic_term_id');
            });
        }

        $pendingBorrowings = $pendingBorrowingsQuery->count();

        // Count physical equipment units by status & condition
        $unitCounts = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->select(
                DB::raw("SUM(CASE WHEN LOWER(status) = 'available' AND LOWER(COALESCE(condition, 'good')) NOT IN ('damaged', 'maintenance', 'worn', 'under repair', 'lost') THEN 1 ELSE 0 END) as available_count"),
                DB::raw("SUM(CASE WHEN (LOWER(status) IN ('damaged', 'maintenance', 'unavailable') OR LOWER(COALESCE(condition, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair')) AND LOWER(COALESCE(condition, 'good')) NOT IN ('lost', 'decommissioned') AND LOWER(COALESCE(status, 'available')) NOT IN ('lost', 'decommissioned') THEN 1 ELSE 0 END) as damage_count"),
                DB::raw("SUM(CASE WHEN LOWER(status) IN ('lost', 'decommissioned') OR LOWER(COALESCE(condition, 'good')) = 'lost' THEN 1 ELSE 0 END) as lost_count")
            )
            ->first();

        $availableEquipment = (int) ($unitCounts->available_count ?? 0);
        $physicalDamages    = (int) ($unitCounts->damage_count ?? 0);
        $physicalLost       = (int) ($unitCounts->lost_count ?? 0);

        // Overdue Returns
        $overdueReturnsQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing'])
            ->where('equipment_borrows.date_of_usage', '<', $now->toDateString());

        if ($termId) {
            $overdueReturnsQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhereNull('equipment_borrows.academic_term_id');
            });
        }

        $overdueReturns = $overdueReturnsQuery->count();

        // Completed Today
        $completedTodayQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->whereDate('tracking_numbers.updated_at', $now->toDateString());

        if ($termId) {
            $completedTodayQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhereNull('equipment_borrows.academic_term_id');
            });
        }

        $completedToday = $completedTodayQuery->count();

        // Top 5 Borrowed Equipment
        $topEquipmentBuilder = DB::table('equipment_borrow_items')
            ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
            ->join('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
            ->select(
                DB::raw("equipment_types.eq_name as name"),
                DB::raw('count(*) as total_borrows')
            );

        if ($termId) {
            $topEquipmentBuilder->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhereNull('equipment_borrows.academic_term_id');
            });
        }

        $topEquipmentData = $topEquipmentBuilder
            ->groupBy('equipment_types.id', 'equipment_types.eq_name')
            ->orderByDesc('total_borrows')
            ->limit(5)
            ->get();

        $topEquipment = $topEquipmentData->map(function ($item, $index) {
            return [
                'rank' => $index + 1,
                'name' => $item->name,
                'count' => $item->total_borrows . ' borrows'
            ];
        });

        // Total Equipment Damages & Lost from Inspections & Physical Units
        $damagesQuery = DB::table('inspections')
            ->where(function($q) {
                $q->where(DB::raw('LOWER(inspections.condition)'), 'damaged')
                  ->orWhere('inspections.violation_type', 'LIKE', '%damage%');
            });

        $inspectionDamages = $damagesQuery->count();
        $totalEquipmentDamages = max($inspectionDamages, $physicalDamages);

        $lostQuery = DB::table('inspections')
            ->where(function($q) {
                $q->where(DB::raw('LOWER(inspections.condition)'), 'lost')
                  ->orWhere('inspections.violation_type', 'LIKE', '%lost%');
            });

        $inspectionLost = $lostQuery->count();
        $totalEquipmentLost = max($inspectionLost, $physicalLost);

        // Programs with Violations / Late Returns (Combining Inspections & Borrowing records)
        $violationsQuery = DB::table('inspections')
            ->leftJoin('venue_bookings', function($j) {
                $j->on('inspections.inspectable_id', '=', 'venue_bookings.id')
                  ->where(function($q) {
                      $q->where('inspections.inspectable_type', \App\Models\VenueBooking::class)
                        ->orWhere('inspections.inspectable_type', 'venue_booking')
                        ->orWhere('inspections.inspectable_type', 'avr_venue_booking');
                  });
            })
            ->leftJoin('equipment_borrows', function($j) {
                $j->on('inspections.inspectable_id', '=', 'equipment_borrows.id')
                  ->where(function($q) {
                      $q->where('inspections.inspectable_type', \App\Models\EquipmentBorrow::class)
                        ->orWhere('inspections.inspectable_type', 'equipment_borrow')
                        ->orWhere('inspections.inspectable_type', 'avr_equipment_borrowing');
                  });
            })
            ->where(function($q) {
                $q->whereNotNull('inspections.violation_type')
                  ->orWhere(DB::raw('LOWER(CAST(inspections.is_late AS CHAR))'), '1')
                  ->orWhere('inspections.timeliness', 'late')
                  ->orWhere(DB::raw('LOWER(inspections.condition)'), 'damaged')
                  ->orWhere(DB::raw('LOWER(inspections.condition)'), 'lost');
            });

        $realDeptViolations = $violationsQuery
            ->select(
                DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, venue_bookings.program_office, 'General') as program_office"),
                DB::raw("SUM(CASE WHEN inspections.is_late = 1 OR inspections.timeliness = 'late' THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN LOWER(inspections.condition) IN ('damaged', 'lost') OR inspections.violation_type IS NOT NULL THEN 1 ELSE 0 END) as violation_count")
            )
            ->groupBy(DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, venue_bookings.program_office, 'General')"))
            ->get();

        // Direct check from equipment_borrows table as well
        $directEbViolations = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->where(function($q) {
                $q->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['late return', 'returned late', 'damaged', 'lost'])
                  ->orWhere('equipment_borrows.is_late', 1)
                  ->orWhere(DB::raw('LOWER(COALESCE(equipment_borrows.status, ""))'), 'like', '%late%');
            })
            ->select(
                DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, 'General') as program_office"),
                DB::raw("SUM(CASE WHEN LOWER(tracking_numbers.status) IN ('late return', 'returned late') OR equipment_borrows.is_late = 1 THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN LOWER(tracking_numbers.status) IN ('damaged', 'lost') THEN 1 ELSE 0 END) as violation_count")
            )
            ->groupBy(DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, 'General')"))
            ->get();

        $deptViolationsMap = [];
        foreach ($realDeptViolations as $dept) {
            $p = $dept->program_office ?: 'General';
            $deptViolationsMap[$p] = [
                'late' => (int) $dept->late_count,
                'violations' => (int) $dept->violation_count,
            ];
        }
        foreach ($directEbViolations as $dept) {
            $p = $dept->program_office ?: 'General';
            if (!isset($deptViolationsMap[$p])) {
                $deptViolationsMap[$p] = [
                    'late' => (int) $dept->late_count,
                    'violations' => (int) $dept->violation_count,
                ];
            } else {
                $deptViolationsMap[$p]['late'] = max($deptViolationsMap[$p]['late'], (int) $dept->late_count);
                $deptViolationsMap[$p]['violations'] = max($deptViolationsMap[$p]['violations'], (int) $dept->violation_count);
            }
        }

        $programsList = [];
        foreach ($deptViolationsMap as $pName => $counts) {
            $late = $counts['late'];
            $violations = $counts['violations'];
            if ($late === 0 && $violations === 0) continue;

            $status = 'Clear';
            if ($violations > 0 || $late > 2) $status = 'Watch List';
            else if ($late > 0) $status = 'Warning';

            $programsList[] = [
                'program' => $pName,
                'late' => $late,
                'violations' => $violations,
                'status' => $status,
            ];
        }

        usort($programsList, function ($a, $b) {
            if ($a['violations'] !== $b['violations']) {
                return $b['violations'] <=> $a['violations'];
            }
            return $b['late'] <=> $a['late'];
        });

        $topViolatingDept = !empty($programsList) ? $programsList[0]['program'] : 'None';

        // Total Venue Bookings
        $totalVbQuery = DB::table('venue_bookings')->whereNull('archived_at');
        if ($termId) {
            $totalVbQuery->where(function($q) use ($termId) {
                $q->where('academic_term_id', $termId)->orWhereNull('academic_term_id');
            });
        }
        $totalVenueBookings = $totalVbQuery->count();

        // Total Equipment Borrows
        $totalEbQuery = DB::table('equipment_borrows')->whereNull('archived_at');
        if ($termId) {
            $totalEbQuery->where(function($q) use ($termId) {
                $q->where('academic_term_id', $termId)->orWhereNull('academic_term_id');
            });
        }
        $totalEquipBorrows = $totalEbQuery->count();

        // Top Booked Departments (Combined Venue Bookings & Equipment Borrows)
        $topBookedDeptsMap = [];
        $vbDepts = DB::table('venue_bookings')->whereNull('archived_at')
            ->select(DB::raw("COALESCE(program_office, 'General') as program_office"), DB::raw('count(*) as total'))
            ->groupBy(DB::raw("COALESCE(program_office, 'General')"))
            ->get();
        foreach ($vbDepts as $row) {
            $p = $row->program_office ?: 'General';
            $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
        }

        $ebDepts = DB::table('equipment_borrows')->whereNull('archived_at')
            ->select(DB::raw("COALESCE(program_office, requestor_program_office, 'General') as program_office"), DB::raw('count(*) as total'))
            ->groupBy(DB::raw("COALESCE(program_office, requestor_program_office, 'General')"))
            ->get();
        foreach ($ebDepts as $row) {
            $p = $row->program_office ?: 'General';
            $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
        }

        arsort($topBookedDeptsMap);
        $topBookedDepts = [];
        foreach (array_slice($topBookedDeptsMap, 0, 5, true) as $name => $count) {
            $topBookedDepts[] = [
                'name' => $name,
                'bookings' => $count,
            ];
        }

        // Active bookings for Calendar & Staff Shift Tasks (Venue Bookings + Equipment Borrows)
        $calendarVenueBookings = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->whereNull('venue_bookings.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['pending', 'approved', 'ongoing', 'on-going', 'post-inspection', 'completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->select(
                'venue_bookings.id',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.date_of_usage',
                'venue_bookings.reservation_end_date',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'venue_bookings.purpose',
                'venue_bookings.equipment_notes',
                'venues.name as venue_name',
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderBy('venue_bookings.date_of_usage', 'asc')
            ->limit(50)
            ->get();

        $calendarEquipBorrowings = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['pending', 'approved', 'ongoing', 'on-going', 'completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->select(
                'equipment_borrows.id',
                DB::raw("COALESCE(equipment_borrows.filer_name, equipment_borrows.requestor_name, 'Requestor') as filer_name"),
                DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, 'Academic Dept') as program_office"),
                'equipment_borrows.date_of_usage',
                DB::raw("COALESCE(equipment_borrows.reservation_end_date, equipment_borrows.date_of_usage) as reservation_end_date"),
                'equipment_borrows.time_start',
                'equipment_borrows.time_end',
                'equipment_borrows.purpose',
                DB::raw("NULL as equipment_notes"),
                DB::raw("'Equipment Loan' as venue_name"),
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderBy('equipment_borrows.date_of_usage', 'asc')
            ->limit(50)
            ->get();

        $calendarBookings = $calendarVenueBookings->concat($calendarEquipBorrowings);

        return [
            'quick_stats' => [
                'total_venue_bookings' => $totalVenueBookings,
                'total_equip_borrows' => $totalEquipBorrows,
                'pending_bookings' => $pendingBookings,
                'pending_borrowings' => $pendingBorrowings,
                'available_equipment' => $availableEquipment,
                'damage_reports' => $physicalDamages,
                'overdue_returns' => $overdueReturns,
                'completed_today' => $completedToday,
                'total_equipment_damages' => $totalEquipmentDamages,
                'total_equipment_lost' => $totalEquipmentLost,
                'top_violating_department' => $topViolatingDept,
            ],
            'top_departments' => $topBookedDepts,
            'top_equipment' => $topEquipment,
            'programs_with_violations' => array_slice($programsList, 0, 5),
            'calendar_bookings' => $calendarBookings,
        ];
    }
}
