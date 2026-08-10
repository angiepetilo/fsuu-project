<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\AvrVenueBooking;
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

        $avrBookingQuery = clone AvrVenueBooking::query();
        $avrBorrowingQuery = clone EquipmentBorrowing::query();

        // Quick Stats
        $pendingBookings = (clone $avrBookingQuery)->where('status', 'pending')->count();
        $pendingBorrowings = (clone $avrBorrowingQuery)->where('status', 'pending')->count();

        // Count available equipment
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
        usort($programsList, function ($a, $b) {
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
