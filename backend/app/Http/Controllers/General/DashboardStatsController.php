<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use App\Services\EquipmentCategoryService;

class DashboardStatsController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            return response()->json($this->getAvrStats($user));
        } catch (\Throwable $e) {
            Log::error("DashboardStatsController Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
            return response()->json([
                'quick_stats' => [
                    'total_venue_bookings' => 0,
                    'total_equip_borrows' => 0,
                    'pending_bookings' => 0,
                    'pending_borrowings' => 0,
                    'pending_approval' => 0,
                    'available_equipment' => 0,
                    'damage_reports' => 0,
                    'overdue_returns' => 0,
                    'completed_today' => 0,
                    'total_equipment_damages' => 0,
                    'total_equipment_lost' => 0,
                    'top_violating_department' => 'None',
                ],
                'top_departments' => [],
                'top_equipment' => [],
                'programs_with_violations' => [],
                'calendar_bookings' => [],
                'error' => $e->getMessage(),
            ], 200);
        }
    }

    private function getAvrStats($user)
    {
        // 1. Auto-synchronize physical unit condition/status before computing statistics
        try {
            EquipmentCategoryService::autoSyncUnitConditions();
        } catch (\Throwable $e) {
            Log::warning("autoSyncUnitConditions warning: " . $e->getMessage());
        }

        $now = Carbon::now();

        // 2. Total Venue Bookings (All non-archived)
        $totalVenueBookings = DB::table('venue_bookings')->whereNull('archived_at')->count();

        // 3. Total Equipment Borrows (All non-archived)
        $totalEquipBorrows = DB::table('equipment_borrows')->whereNull('archived_at')->count();

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

        $postInspectionPendingVenue = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('venue_bookings.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['ongoing', 'on-going', 'post-inspection'])
            ->count();

        $postInspectionPendingEquip = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['ongoing', 'on-going', 'borrowed', 'post-inspection'])
            ->count();

        $pendingApproval = $pendingVb + $pendingEb;

        // 5. Physical Equipment Units Count
        $unitCounts = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->select(
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(`condition`, 'good')) = 'good' AND LOWER(`status`) NOT IN ('damaged', 'maintenance', 'unavailable', 'lost', 'decommissioned') THEN 1 ELSE 0 END) as available_count"),
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(`condition`, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair') OR (LOWER(`status`) IN ('damaged', 'maintenance') AND LOWER(COALESCE(`condition`, '')) != 'lost') THEN 1 ELSE 0 END) as damage_count"),
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(`condition`, '')) = 'lost' OR LOWER(`status`) IN ('lost', 'decommissioned') THEN 1 ELSE 0 END) as lost_count")
            )
            ->first();

        $availableEquipment = (int) ($unitCounts->available_count ?? 0);
        $physicalDamages    = (int) ($unitCounts->damage_count ?? 0);
        $physicalLost       = (int) ($unitCounts->lost_count ?? 0);

        // 6. Inspection-based Lost and Damaged counts
        $inspectionDamages = DB::table('inspections')
            ->where(function($q) {
                $q->where(DB::raw('LOWER(`condition`)'), 'damaged')
                  ->orWhere('violation_type', 'LIKE', '%damage%');
            })
            ->count();

        $inspectionLost = DB::table('inspections')
            ->where(function($q) {
                $q->where(DB::raw('LOWER(`condition`)'), 'lost')
                  ->orWhere('violation_type', 'LIKE', '%lost%');
            })
            ->count();

        $totalEquipmentDamages = max($physicalDamages, $inspectionDamages);
        $totalEquipmentLost = max($physicalLost, $inspectionLost);

        // 7. Overdue Returns & Completed Today
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

        // 8. Top 5 Borrowed Equipment Types
        $topEquipment = [];
        try {
            $topEquipmentData = DB::table('equipment_borrow_items')
                ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                ->join('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
                ->select(
                    'equipment_types.eq_name as name',
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
        } catch (\Throwable $e) {}

        // 9. Department with Most Bookings (Venue Bookings + Equipment Borrows)
        $topBookedDeptsMap = [];
        try {
            $vbDepts = DB::table('venue_bookings')
                ->whereNull('archived_at')
                ->select('program_office', DB::raw('count(*) as total'))
                ->groupBy('program_office')
                ->get();
            foreach ($vbDepts as $row) {
                $p = trim($row->program_office ?: 'General');
                if ($p) $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
            }

            $ebDepts = DB::table('equipment_borrows')
                ->whereNull('archived_at')
                ->select('program_office', DB::raw('count(*) as total'))
                ->groupBy('program_office')
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

        // 10. Department with Most Violations
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
                    DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General') as program_office"),
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

            // Direct check from equipment_borrows tracking status
            $ebBreaches = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->select('equipment_borrows.program_office', 'tracking_numbers.status as tracking_status')
                ->get();

            foreach ($ebBreaches as $eb) {
                $p = trim($eb->program_office ?: 'General');
                $tStatus = strtolower((string)($eb->tracking_status ?? ''));
                $isLate = str_contains($tStatus, 'late');
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

        // Sort by late count for Top Late Department
        $lateSortedPrograms = $programsList;
        usort($lateSortedPrograms, fn($a, $b) => $b['late'] <=> $a['late']);
        $topLateDept = (!empty($lateSortedPrograms) && $lateSortedPrograms[0]['late'] > 0) ? $lateSortedPrograms[0]['program'] : 'None';

        // 10b. Violating Students / Borrowers List
        $violatingStudents = [];
        try {
            if (Schema::hasTable('inspections')) {
                $rawInspStudents = DB::table('inspections')
                    ->where(function ($q) {
                        $q->where('inspections.is_late', 1)
                          ->orWhereIn(DB::raw('LOWER(inspections.condition)'), ['damaged', 'lost'])
                          ->orWhereNotNull('inspections.violation_type');
                    })
                    ->leftJoin('equipment_borrows', function ($join) {
                        $join->on('inspections.inspectable_id', '=', 'equipment_borrows.id')
                             ->where(function ($q) {
                                 $q->where('inspections.inspectable_type', 'equipment_borrow')
                                   ->orWhere('inspections.inspectable_type', 'avr_equipment_borrowing')
                                   ->orWhere('inspections.inspectable_type', 'App\\Models\\EquipmentBorrowing');
                             });
                    })
                    ->leftJoin('venue_bookings', function ($join) {
                        $join->on('inspections.inspectable_id', '=', 'venue_bookings.id')
                             ->where(function ($q) {
                                 $q->where('inspections.inspectable_type', 'venue_booking')
                                   ->orWhere('inspections.inspectable_type', 'avr_venue_booking')
                                   ->orWhere('inspections.inspectable_type', 'App\\Models\\VenueBooking');
                             });
                    })
                    ->leftJoin('tracking_numbers', function ($join) {
                        $join->on('equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                             ->orOn('venue_bookings.tracking_number_id', '=', 'tracking_numbers.id');
                    })
                    ->select(
                        'inspections.id as inspection_id',
                        'inspections.condition',
                        'inspections.violation_type',
                        'inspections.is_late',
                        'inspections.minutes_late',
                        'inspections.timeliness',
                        'inspections.created_at as incident_date',
                        DB::raw("COALESCE(equipment_borrows.filer_name, venue_bookings.filer_name, 'Borrower') as student_name"),
                        DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'Department') as department"),
                        DB::raw("COALESCE(tracking_numbers.reference_code, 'TRK-INCIDENT') as reference_code"),
                        DB::raw("CASE WHEN equipment_borrows.id IS NOT NULL THEN 'Equipment Loan' ELSE 'Venue Booking' END as transaction_type")
                    )
                    ->orderByDesc('inspections.id')
                    ->limit(20)
                    ->get();

                $violatingStudents = $rawInspStudents->map(function ($row) {
                    $dt = Carbon::parse($row->incident_date);
                    $violationLabel = $row->violation_type ?: ($row->is_late ? "Late Return (" . ($row->minutes_late ?: 15) . " mins)" : ucfirst($row->condition));
                    return [
                        'id'               => $row->inspection_id,
                        'name'             => $row->student_name,
                        'department'       => $row->department,
                        'reference_code'   => $row->reference_code,
                        'type'             => $row->transaction_type,
                        'violation'        => $violationLabel,
                        'is_late'          => (bool)$row->is_late,
                        'minutes_late'     => $row->minutes_late ?: 0,
                        'date'             => $dt->format('M d, Y h:i A'),
                    ];
                })->all();
            }
        } catch (\Throwable $e) {}

        // 11. Schedule Overview Calendar Data (Both Venue Bookings and Equipment Borrowings)
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
                'equipment_borrows.filer_name',
                'equipment_borrows.program_office',
                'equipment_borrows.date_of_usage',
                'equipment_borrows.date_of_usage as reservation_end_date',
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
                'pending_approval_count' => $pendingVb,
                'pending_venue_count' => $pendingVb,
                'pending_equipment_count' => $pendingEb,
                'pending_borrow_count' => $pendingEb,
                'post_inspection_pending_venue' => $postInspectionPendingVenue,
                'post_inspection_pending_equip' => $postInspectionPendingEquip,
                'available_equipment' => $availableEquipment,
                'damage_reports' => $physicalDamages,
                'overdue_returns' => $overdueReturns,
                'completed_today' => $completedToday,
                'total_equipment_damages' => $totalEquipmentDamages,
                'total_equipment_lost' => $totalEquipmentLost,
                'top_violating_department' => $topViolatingDept,
                'top_late_department' => $topLateDept,
            ],
            'top_departments' => $topBookedDepts,
            'top_equipment' => $topEquipment,
            'programs_with_violations' => array_slice($programsList, 0, 5),
            'violating_students' => $violatingStudents,
            'calendar_bookings' => $calendarBookings,
        ];
    }
}
