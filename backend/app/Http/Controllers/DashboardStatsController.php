<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\AvrVenueBooking;
use App\Models\EquipmentBorrowing;
use App\Models\ScoStudioReservation;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use Carbon\Carbon;

class DashboardStatsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSCO = $user->office && $user->office->code === 'SCO';

        $cacheKey = $isSCO ? 'sco_dashboard_stats_' . $user->id : 'avr_dashboard_stats_' . $user->id;

        $stats = Cache::remember($cacheKey, 300, function () use ($user, $isSCO) {
            return $isSCO ? $this->getScoStats($user) : $this->getAvrStats($user);
        });

        return response()->json($stats);
    }

    private function getScoStats($user)
    {
        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek();
        $startOfMonth = $now->copy()->startOfMonth();

        // Base query for SCO
        $scoQuery = ScoStudioReservation::whereHas('venue', function ($q) use ($user) {
            $q->where('office_id', $user->office_id);
        });

        // Quick Stats
        $newBookingsWeek = (clone $scoQuery)->where('created_at', '>=', $startOfWeek)->count();
        $pendingApproval = (clone $scoQuery)->where('status', 'pending')->count();
        $approvedMonth = (clone $scoQuery)->where('status', 'approved')->where('updated_at', '>=', $startOfMonth)->count();
        $cancelledMonth = (clone $scoQuery)->whereIn('status', ['cancelled', 'rejected'])->where('updated_at', '>=', $startOfMonth)->count();
        $totalBookings = (clone $scoQuery)->count();
        
        // Maintenance Due: For now, static or count damaged units in SCO (if they had equipment)
        // SCO might have equipment units attached to their office. 
        $maintenanceDue = EquipmentUnit::where('unit_status', 'damaged')
            ->whereHas('equipmentType.venues', function ($q) use ($user) {
                $q->where('office_id', $user->office_id);
            })->count();

        // Bookings by Department
        // Let's get actual counts
        $deptBookings = (clone $scoQuery)
            ->where('created_at', '>=', $startOfMonth)
            ->select('requestor_program_office', DB::raw('count(*) as total'))
            ->groupBy('requestor_program_office')
            ->get();
            
        $colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
        $bookingsByDept = [];
        $maxCount = $deptBookings->max('total') ?: 1; // avoid division by zero
        
        foreach ($deptBookings->values() as $index => $dept) {
            $percentage = round(($dept->total / $maxCount) * 100);
            $color = $colors[$index % count($colors)];
            $bookingsByDept[] = [
                'label' => $dept->requestor_program_office ?: 'Other',
                'h' => $percentage . '%',
                'color' => $color,
                'count' => $dept->total
            ];
        }

        // Equipment Inventory Status (SCO)
        $inventoryStatus = [];
        // Just an example structure
        $scoTypes = EquipmentType::whereHas('venues', function($q) use ($user) {
            $q->where('office_id', $user->office_id);
        })->withCount([
            'units as total_units',
            'units as available_units' => function($q) {
                $q->where('unit_status', 'available');
            }
        ])->take(4)->get();

        foreach ($scoTypes->values() as $index => $type) {
            $pct = $type->total_units > 0 ? round(($type->available_units / $type->total_units) * 100) : 0;
            $color = $colors[$index % count($colors)];
            $inventoryStatus[] = [
                'name' => $type->name,
                'stat' => "{$type->available_units}/{$type->total_units} available",
                'w' => $pct . '%',
                'color' => $color
            ];
        }

        return [
            'quick_stats' => [
                'new_bookings_week' => $newBookingsWeek,
                'pending_approval' => $pendingApproval,
                'approved_month' => $approvedMonth,
                'cancelled_month' => $cancelledMonth,
                'total_bookings' => $totalBookings,
                'maintenance_due' => $maintenanceDue,
            ],
            'bookings_by_department' => $bookingsByDept,
            'equipment_inventory_status' => $inventoryStatus,
        ];
    }

    private function getAvrStats($user)
    {
        $now = Carbon::now();

        $avrBookingQuery = clone AvrVenueBooking::query();
        $avrBorrowingQuery = clone EquipmentBorrowing::query();

        // Quick Stats
        $pendingBookings = (clone $avrBookingQuery)->where('status', 'pending')->count();
        $pendingBorrowings = (clone $avrBorrowingQuery)->where('status', 'pending')->count();
        
        // Count available equipment in AVR
        // Assuming AVR equipment is those not in SCO (for now) or linked to AVR office
        // We'll just count total available equipment if they are globally shared, or if AVR specific.
        $availableEquipment = EquipmentUnit::where('unit_status', 'available')->count();
        $damageReports = EquipmentUnit::where('unit_status', 'damaged')->count();

        $overdueReturns = (clone $avrBorrowingQuery)
            ->where('status', 'in_use')
            ->where('end_datetime', '<', $now)
            ->count();

        $completedToday = (clone $avrBorrowingQuery)
            ->whereIn('status', ['completed', 'completed_with_damage'])
            ->whereDate('updated_at', $now->toDateString())
            ->count();

        // Top 5 Borrowed Equipment
        $topEquipmentData = DB::table('equipment_borrowing_items')
            ->join('equipment_types', 'equipment_borrowing_items.equipment_type_id', '=', 'equipment_types.id')
            ->select('equipment_types.name', DB::raw('count(*) as total_borrows'))
            ->groupBy('equipment_types.id', 'equipment_types.name')
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

        // Programs with Violations / Late Returns
        // We calculate late by seeing who is currently overdue.
        // We calculate violations by seeing who has 'completed_with_damage'.
        $programsLate = (clone $avrBorrowingQuery)
            ->where('status', 'in_use')
            ->where('end_datetime', '<', $now)
            ->select('requestor_program_office', DB::raw('count(*) as late_count'))
            ->groupBy('requestor_program_office')
            ->get()
            ->keyBy('requestor_program_office');

        $programsDamaged = (clone $avrBorrowingQuery)
            ->where('status', 'completed_with_damage')
            ->select('requestor_program_office', DB::raw('count(*) as damage_count'))
            ->groupBy('requestor_program_office')
            ->get()
            ->keyBy('requestor_program_office');
            
        $allPrograms = $programsLate->keys()->merge($programsDamaged->keys())->unique();
        
        $programsList = [];
        foreach ($allPrograms as $program) {
            $late = $programsLate->has($program) ? $programsLate[$program]->late_count : 0;
            $violations = $programsDamaged->has($program) ? $programsDamaged[$program]->damage_count : 0;
            
            $status = 'Clear';
            if ($violations > 0 || $late > 2) $status = 'Watch List';
            else if ($late > 0) $status = 'Warning';

            $programsList[] = [
                'program' => $program ?: 'General',
                'late' => $late,
                'violations' => $violations,
                'status' => $status,
            ];
        }

        // Sort by violations desc, then late desc
        usort($programsList, function($a, $b) {
            if ($a['violations'] !== $b['violations']) {
                return $b['violations'] <=> $a['violations'];
            }
            return $b['late'] <=> $a['late'];
        });

        return [
            'quick_stats' => [
                'pending_bookings' => $pendingBookings,
                'pending_borrowings' => $pendingBorrowings,
                'available_equipment' => $availableEquipment,
                'damage_reports' => $damageReports,
                'overdue_returns' => $overdueReturns,
                'completed_today' => $completedToday,
            ],
            'top_equipment' => $topEquipment,
            'programs_with_violations' => array_slice($programsList, 0, 5),
        ];
    }
}
