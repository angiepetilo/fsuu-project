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

        // 1. Total Venue Bookings (All non-archived)
        $totalVenueBookings = DB::table('venue_bookings')->whereNull('archived_at')->count();

        // 2. Total Equipment Borrows (All non-archived)
        $totalEquipBorrows = DB::table('equipment_borrows')->whereNull('archived_at')->count();

        // 3. Pending Approval (Both Venue Bookings & Equipment Borrows)
        $pendingVb = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('venue_bookings.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending')
            ->count();

        $pendingEb = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending')
            ->count();

        $pendingApproval = $pendingVb + $pendingEb;

        // 4. Physical Units Inventory: Available, Damaged, and Lost counts
        $unitCounts = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->select(
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(condition, 'good')) = 'good' AND LOWER(status) NOT IN ('damaged', 'maintenance', 'unavailable', 'lost', 'decommissioned') THEN 1 ELSE 0 END) as available_count"),
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(condition, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair') OR (LOWER(status) IN ('damaged', 'maintenance') AND LOWER(COALESCE(condition, '')) != 'lost') THEN 1 ELSE 0 END) as damage_count"),
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(condition, '')) = 'lost' OR LOWER(status) IN ('lost', 'decommissioned') THEN 1 ELSE 0 END) as lost_count")
            )
            ->first();

        $availableEquipment = (int) ($unitCounts->available_count ?? 0);
        $physicalDamages    = (int) ($unitCounts->damage_count ?? 0);
        $physicalLost       = (int) ($unitCounts->lost_count ?? 0);

        // Inspection-based Lost and Damaged counts
        $inspectionDamages = DB::table('inspections')
            ->where(function($q) {
                $q->where(DB::raw('LOWER(condition)'), 'damaged')
                  ->orWhere('violation_type', 'LIKE', '%damage%');
            })
            ->count();

        $inspectionLost = DB::table('inspections')
            ->where(function($q) {
                $q->where(DB::raw('LOWER(condition)'), 'lost')
                  ->orWhere('violation_type', 'LIKE', '%lost%');
            })
            ->count();

        $totalEquipmentDamages = max($physicalDamages, $inspectionDamages);
        $totalEquipmentLost = max($physicalLost, $inspectionLost);

        // 5. Overdue Returns & Completed Today
        $overdueReturns = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing'])
            ->where('equipment_borrows.date_of_usage', '<', $now->toDateString())
            ->count();

        $completedToday = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->whereDate('tracking_numbers.updated_at', $now->toDateString())
            ->count();

        // 6. Top 5 Borrowed Equipment Types
        $topEquipment = [];
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_borrow_items')) {
                $topEquipmentData = DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                    ->join('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
                    ->select(
                        DB::raw("equipment_types.eq_name as name"),
                        DB::raw('count(*) as total_borrows')
                    )
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
                })->all();
            }
        } catch (\Throwable $e) {}

        // 7. Department with Most Venue Bookings & Borrowings
        $topBookedDeptsMap = [];
        try {
            $vbDepts = DB::table('venue_bookings')
                ->whereNull('archived_at')
                ->select(DB::raw("COALESCE(program_office, 'General') as program_office"), DB::raw('count(*) as total'))
                ->groupBy(DB::raw("COALESCE(program_office, 'General')"))
                ->get();
            foreach ($vbDepts as $row) {
                $p = trim($row->program_office ?: 'General');
                if ($p) $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
            }

            $ebDepts = DB::table('equipment_borrows')
                ->whereNull('archived_at')
                ->select(DB::raw("COALESCE(program_office, requestor_program_office, 'General') as program_office"), DB::raw('count(*) as total'))
                ->groupBy(DB::raw("COALESCE(program_office, requestor_program_office, 'General')"))
                ->get();
            foreach ($ebDepts as $row) {
                $p = trim($row->program_office ?: 'General');
                if ($p) $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
            }
        } catch (\Throwable $e) {}

        arsort($topBookedDeptsMap);
        $topBookedDepts = [];
        foreach (array_slice($topBookedDeptsMap, 0, 5, true) as $name => $count) {
            $topBookedDepts[] = [
                'name' => $name,
                'bookings' => (int) $count,
                'count' => (int) $count,
            ];
        }

        // 8. Department with Most Violations (Aggregated from inspections & borrow tracking)
        $deptViolationsMap = [];
        try {
            $insps = DB::table('inspections')
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
                ->select(
                    DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, venue_bookings.program_office, 'General') as program_office"),
                    'inspections.condition',
                    'inspections.violation_type',
                    'inspections.is_late',
                    'inspections.timeliness'
                )
                ->get();

            foreach ($insps as $insp) {
                $p = trim($insp->program_office ?: 'General');
                if (!isset($deptViolationsMap[$p])) {
                    $deptViolationsMap[$p] = ['late' => 0, 'violations' => 0];
                }
                $isLate = $insp->is_late == 1 || strtolower((string)$insp->timeliness) === 'late' || str_contains(strtolower((string)$insp->violation_type), 'late');
                $isViolation = in_array(strtolower((string)$insp->condition), ['damaged', 'lost']) || !empty($insp->violation_type);
                if ($isLate) $deptViolationsMap[$p]['late'] += 1;
                if ($isViolation) $deptViolationsMap[$p]['violations'] += 1;
            }

            // Direct check from equipment_borrows table (e.g. status = 'late return' or 'lost' or 'damaged')
            $ebBreaches = DB::table('equipment_borrows')
                ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->select(
                    DB::raw("COALESCE(equipment_borrows.program_office, equipment_borrows.requestor_program_office, 'General') as program_office"),
                    'equipment_borrows.is_late',
                    'tracking_numbers.status as tracking_status',
                    'equipment_borrows.status as eb_status'
                )
                ->get();

            foreach ($ebBreaches as $eb) {
                $p = trim($eb->program_office ?: 'General');
                $tStatus = strtolower((string)($eb->tracking_status ?? $eb->eb_status ?? ''));
                $isLate = $eb->is_late == 1 || str_contains($tStatus, 'late');
                $isViolation = str_contains($tStatus, 'damaged') || str_contains($tStatus, 'lost');
                if ($isLate || $isViolation) {
                    if (!isset($deptViolationsMap[$p])) {
                        $deptViolationsMap[$p] = ['late' => 0, 'violations' => 0];
                    }
                    if ($isLate && $deptViolationsMap[$p]['late'] === 0) $deptViolationsMap[$p]['late'] += 1;
                    if ($isViolation && $deptViolationsMap[$p]['violations'] === 0) $deptViolationsMap[$p]['violations'] += 1;
                }
            }
        } catch (\Throwable $e) {}

        $programsList = [];
        foreach ($deptViolationsMap as $pName => $counts) {
            $late = $counts['late'];
            $violations = $counts['violations'];
            if ($late === 0 && $violations === 0) continue;

            $status = ($violations > 0 || $late > 2) ? 'Watch List' : ($late > 0 ? 'Warning' : 'Clear');

            $programsList[] = [
                'program' => $pName,
                'late' => $late,
                'violations' => $violations,
                'count' => $violations + $late,
                'status' => $status,
            ];
        }

        usort($programsList, fn($a, $b) => ($b['violations'] + $b['late']) <=> ($a['violations'] + $a['late']));
        $topViolatingDept = !empty($programsList) ? $programsList[0]['program'] : 'None';

        // 9. Schedule Overview Calendar Data (Both Venue Bookings and Equipment Borrowings)
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
                'pending_bookings' => $pendingVb,
                'pending_borrowings' => $pendingEb,
                'pending_approval' => $pendingApproval,
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
