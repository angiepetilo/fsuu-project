<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardStatsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        return response()->json($this->getAvrStats($user));
    }

    private function getAvrStats($user)
    {
        $now = Carbon::now();

        $activeTerm = \App\Models\AcademicTerm::where('is_active', true)->first();
        $termId = $activeTerm ? $activeTerm->id : null;

        // Pending Bookings
        $pendingBookingsQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('venue_bookings.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending');

        if ($termId) {
            $pendingBookingsQuery->where('venue_bookings.academic_term_id', $termId);
        }

        $pendingBookings = $pendingBookingsQuery->count();

        // Pending Borrowings
        $pendingBorrowingsQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending');

        if ($termId) {
            $pendingBorrowingsQuery->where('equipment_borrows.academic_term_id', $termId);
        }

        $pendingBorrowings = $pendingBorrowingsQuery->count();

        // Count available equipment & damage reports in 1 single grouped query
        $unitCounts = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->select(
                DB::raw("SUM(CASE WHEN LOWER(status) = 'available' AND LOWER(COALESCE(condition, 'good')) NOT IN ('damaged', 'maintenance', 'worn', 'under repair') THEN 1 ELSE 0 END) as available_count"),
                DB::raw("SUM(CASE WHEN LOWER(status) IN ('damaged', 'maintenance', 'unavailable') OR LOWER(COALESCE(condition, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair') THEN 1 ELSE 0 END) as damage_count")
            )
            ->first();

        $availableEquipment = (int) ($unitCounts->available_count ?? 0);
        $damageReports      = (int) ($unitCounts->damage_count ?? 0);

        // Overdue Returns
        $overdueReturnsQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing'])
            ->where('equipment_borrows.date_of_usage', '<', $now->toDateString());

        if ($termId) {
            $overdueReturnsQuery->where('equipment_borrows.academic_term_id', $termId);
        }

        $overdueReturns = $overdueReturnsQuery->count();

        // Completed Today
        $completedTodayQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->where(DB::raw('LOWER(tracking_numbers.status)'), 'completed')
            ->whereDate('tracking_numbers.updated_at', $now->toDateString());

        if ($termId) {
            $completedTodayQuery->where('equipment_borrows.academic_term_id', $termId);
        }

        $completedToday = $completedTodayQuery->count();

        // Top 5 Borrowed Equipment (joined with equipment_borrow_items)
        $topEquipmentBuilder = DB::table('equipment_borrow_items')
            ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
            ->join('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
            ->select(
                DB::raw("equipment_types.eq_name as name"),
                DB::raw('count(*) as total_borrows')
            );

        if ($termId) {
            $topEquipmentBuilder->where('equipment_borrows.academic_term_id', $termId);
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

        // Total Equipment Damages & Lost from Inspections
        $damagesQuery = DB::table('inspections')
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
                $q->where(DB::raw('LOWER(inspections.condition)'), 'damaged')
                  ->orWhere('inspections.violation_type', 'LIKE', '%damage%');
            });

        if ($termId) {
            $damagesQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhere('venue_bookings.academic_term_id', $termId);
            });
        }

        $inspectionDamages = $damagesQuery->count();

        $damagedUnitsQuery = DB::table('equipment_units')
            ->whereNull('equipment_units.archived_at')
            ->where(function($q) {
                $q->whereIn(DB::raw('LOWER(equipment_units.status)'), ['damaged', 'unavailable'])
                  ->orWhereIn(DB::raw('LOWER(equipment_units.condition)'), ['damaged']);
            });

        $physicalDamages = $damagedUnitsQuery->count();
        $totalEquipmentDamages = $inspectionDamages + $physicalDamages;

        $lostQuery = DB::table('inspections')
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
            ->where(DB::raw('LOWER(inspections.condition)'), 'lost');

        if ($termId) {
            $lostQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhere('venue_bookings.academic_term_id', $termId);
            });
        }

        $totalEquipmentLost = $lostQuery->count();

        // Programs with Violations / Late Returns from Real Inspections
        $violationsQuery = DB::table('inspections')
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
                $q->whereNotNull('inspections.violation_type')
                  ->orWhere(DB::raw('LOWER(CAST(inspections.is_late AS CHAR))'), '1')
                  ->orWhere('inspections.timeliness', 'late')
                  ->orWhere(DB::raw('LOWER(inspections.condition)'), 'damaged')
                  ->orWhere(DB::raw('LOWER(inspections.condition)'), 'lost');
            });

        if ($termId) {
            $violationsQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhere('venue_bookings.academic_term_id', $termId);
            });
        }

        $realDeptViolations = $violationsQuery
            ->select(
                DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General') as program_office"),
                DB::raw("SUM(CASE WHEN inspections.is_late = 1 OR inspections.timeliness = 'late' THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN LOWER(inspections.condition) IN ('damaged', 'lost') OR inspections.violation_type IS NOT NULL THEN 1 ELSE 0 END) as violation_count")
            )
            ->groupBy(DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General')"))
            ->get();

        $programsList = [];
        foreach ($realDeptViolations as $dept) {
            $late = (int)$dept->late_count;
            $violations = (int)$dept->violation_count;
            if ($late === 0 && $violations === 0) continue;

            $status = 'Clear';
            if ($violations > 0 || $late > 2) $status = 'Watch List';
            else if ($late > 0) $status = 'Warning';

            $programsList[] = [
                'program' => $dept->program_office ?: 'General',
                'late' => $late,
                'violations' => $violations,
                'status' => $status,
            ];
        }

        // Sort by violations desc, then late desc
        usort($programsList, function ($a, $b) {
            if ($a['violations'] !== $b['violations']) {
                return $b['violations'] <=> $a['violations'];
            }
            return $b['late'] <=> $a['late'];
        });

        $topViolatingDept = !empty($programsList) ? $programsList[0]['program'] : 'None';

        // Total Venue Bookings (active term)
        $totalVbQuery = DB::table('venue_bookings')->whereNull('archived_at');
        if ($termId) $totalVbQuery->where('academic_term_id', $termId);
        $totalVenueBookings = $totalVbQuery->count();

        // Total Equipment Borrows (active term)
        $totalEbQuery = DB::table('equipment_borrows')->whereNull('archived_at');
        if ($termId) $totalEbQuery->where('academic_term_id', $termId);
        $totalEquipBorrows = $totalEbQuery->count();

        // Top Booked Departments (from venue bookings and equipment borrows)
        $deptBookingsBuilder = DB::table('venue_bookings')
            ->whereNull('archived_at')
            ->select('program_office', DB::raw('count(*) as total'));
        if ($termId) $deptBookingsBuilder->where('academic_term_id', $termId);
        $deptBookings = $deptBookingsBuilder
            ->groupBy('program_office')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $topBookedDepts = $deptBookings->map(function($d) {
            return [
                'name' => $d->program_office ?: 'Academic Dept',
                'bookings' => (int)$d->total,
            ];
        });

        // Lightweight active bookings for calendar & tasks
        $calendarBookings = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->whereNull('venue_bookings.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['pending', 'approved', 'ongoing', 'on-going', 'post-inspection', 'completed'])
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
            ->limit(100)
            ->get();

        return [
            'quick_stats' => [
                'total_venue_bookings' => $totalVenueBookings,
                'total_equip_borrows' => $totalEquipBorrows,
                'pending_bookings' => $pendingBookings,
                'pending_borrowings' => $pendingBorrowings,
                'available_equipment' => $availableEquipment,
                'damage_reports' => $damageReports,
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
