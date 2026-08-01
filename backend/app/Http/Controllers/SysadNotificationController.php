<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SysadNotificationController extends Controller
{
    public function index(): JsonResponse
    {
        // Pull the 5 most recent venue bookings
        $recentVenueBookings = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
            ->whereNull('venue_bookings.archived_at')
            ->select(
                'venue_bookings.id',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.created_at',
                'venues.name as venue_name',
                'offices.name as office_name',
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderByDesc('venue_bookings.created_at')
            ->limit(5)
            ->get()
            ->map(fn ($b) => [
                'id'      => 'vb-' . $b->id,
                'title'   => ($b->office_name ?? 'FSUU Main') . ' Reservation',
                'message' => ($b->venue_name ?? 'AVR') . ' booked by ' . ($b->program_office ?? $b->filer_name ?? 'Unknown') . ' — ' . $b->reference_code,
                'office'  => $b->office_name ?? 'FSUU Main',
                'ref'     => $b->reference_code,
                'status'  => $b->status,
                'time'    => Carbon::parse($b->created_at)->diffForHumans(),
            ]);

        // Pull the 5 most recent equipment borrows
        $recentEquipBorrows = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->select(
                'equipment_borrows.id',
                'equipment_borrows.filer_name',
                'equipment_borrows.program_office',
                'equipment_borrows.created_at',
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderByDesc('equipment_borrows.created_at')
            ->limit(5)
            ->get()
            ->map(fn ($b) => [
                'id'      => 'eb-' . $b->id,
                'title'   => 'Equipment Borrow Alert',
                'message' => 'Equipment borrowed by ' . ($b->program_office ?? $b->filer_name ?? 'Unknown') . ' — ' . $b->reference_code,
                'office'  => 'FSUU Main',
                'ref'     => $b->reference_code,
                'status'  => $b->status,
                'time'    => Carbon::parse($b->created_at)->diffForHumans(),
            ]);

        $all = $recentVenueBookings
            ->concat($recentEquipBorrows)
            ->sortByDesc('time')
            ->values();

        return response()->json($all);
    }
}
