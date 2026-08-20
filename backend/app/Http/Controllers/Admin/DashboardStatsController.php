<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
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
        $isSuperAdmin = $user && $user->isSuperAdmin();
        $officeId = $user ? $user->office_id : null;

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

        if (!$isSuperAdmin && $officeId) {
            $pendingBookingsQuery->join('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                ->where('venues.office_id', $officeId);
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

        if (!$isSuperAdmin && $officeId) {
            $pendingBorrowingsQuery->where('equipment_borrows.office_id', $officeId);
        }
        $pendingBorrowings = $pendingBorrowingsQuery->count();

        // Count available equipment & damage reports
        $equipUnitQuery = DB::table('equipment_units')
            ->whereNull('equipment_units.archived_at');

        if (!$isSuperAdmin && $officeId) {
            $equipUnitQuery->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                ->where('equipment_types.office_id', $officeId);
        }

        $availableEquipment = (clone $equipUnitQuery)
            ->where(DB::raw('LOWER(equipment_units.status)'), 'available')
            ->count();

        $damageReports = (clone $equipUnitQuery)
            ->where(function($q) {
                $q->whereIn(DB::raw('LOWER(equipment_units.status)'), ['damaged', 'maintenance', 'unavailable'])
                  ->orWhereIn(DB::raw('LOWER(equipment_units.`condition`)'), ['damaged', 'maintenance', 'worn']);
            })
            ->count();

        // Overdue Returns
        $overdueReturnsQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing'])
            ->where('equipment_borrows.date_of_usage', '<', $now->toDateString());

        if ($termId) {
            $overdueReturnsQuery->where('equipment_borrows.academic_term_id', $termId);
        }

        if (!$isSuperAdmin && $officeId) {
            $overdueReturnsQuery->where('equipment_borrows.office_id', $officeId);
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

        if (!$isSuperAdmin && $officeId) {
            $completedTodayQuery->where('equipment_borrows.office_id', $officeId);
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

        if (!$isSuperAdmin && $officeId) {
            $topEquipmentBuilder->where('equipment_types.office_id', $officeId);
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

        // Total Equipment Damages & Lost from Inspections (Scoped per office)
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
                $q->where(DB::raw('LOWER(inspections.`condition`)'), 'damaged')
                  ->orWhere('inspections.violation_type', 'LIKE', '%damage%');
            });

        if ($termId) {
            $damagesQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhere('venue_bookings.academic_term_id', $termId);
            });
        }

        if (!$isSuperAdmin && $officeId) {
            $damagesQuery->where(function($q) use ($officeId) {
                $q->where('equipment_borrows.office_id', $officeId)
                  ->orWhere('venues.office_id', $officeId);
            });
        }
        $inspectionDamages = $damagesQuery->count();

        $damagedUnitsQuery = DB::table('equipment_units')
            ->whereNull('equipment_units.archived_at')
            ->where(function($q) {
                $q->whereIn(DB::raw('LOWER(equipment_units.status)'), ['damaged', 'unavailable'])
                  ->orWhereIn(DB::raw('LOWER(equipment_units.`condition`)'), ['damaged']);
            });

        if (!$isSuperAdmin && $officeId) {
            $damagedUnitsQuery->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                ->where('equipment_types.office_id', $officeId);
        }
        
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
            ->where(DB::raw('LOWER(inspections.`condition`)'), 'lost');

        if ($termId) {
            $lostQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhere('venue_bookings.academic_term_id', $termId);
            });
        }

        if (!$isSuperAdmin && $officeId) {
            $lostQuery->where(function($q) use ($officeId) {
                $q->where('equipment_borrows.office_id', $officeId)
                  ->orWhere('venues.office_id', $officeId);
            });
        }
        $totalEquipmentLost = $lostQuery->count();

        // Programs with Violations / Late Returns from Real Inspections (Scoped per office)
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
                  ->orWhere(DB::raw('LOWER(inspections.is_late)'), 1)
                  ->orWhere('inspections.timeliness', 'late')
                  ->orWhere(DB::raw('LOWER(inspections.`condition`)'), 'damaged')
                  ->orWhere(DB::raw('LOWER(inspections.`condition`)'), 'lost');
            });

        if ($termId) {
            $violationsQuery->where(function($q) use ($termId) {
                $q->where('equipment_borrows.academic_term_id', $termId)
                  ->orWhere('venue_bookings.academic_term_id', $termId);
            });
        }

        if (!$isSuperAdmin && $officeId) {
            $violationsQuery->where(function($q) use ($officeId) {
                $q->where('equipment_borrows.office_id', $officeId)
                  ->orWhere('venues.office_id', $officeId);
            });
        }

        $realDeptViolations = $violationsQuery
            ->select(
                DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General') as program_office"),
                DB::raw("SUM(CASE WHEN inspections.is_late = 1 OR inspections.timeliness = 'late' THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN LOWER(inspections.`condition`) IN ('damaged', 'lost') OR inspections.violation_type IS NOT NULL THEN 1 ELSE 0 END) as violation_count")
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

        return [
            'quick_stats' => [
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
            'top_equipment' => $topEquipment,
            'programs_with_violations' => array_slice($programsList, 0, 5),
        ];
    }
}
