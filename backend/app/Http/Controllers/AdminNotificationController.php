<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();
        $officeId = $user->office_id;

        // ── Venue Bookings ─────────────────────────────────────────────────────
        $vbQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
            ->whereNull('venue_bookings.archived_at')
            ->select(
                'venue_bookings.id',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.created_at',
                'venue_bookings.updated_at',
                'venues.name as venue_name',
                'offices.name as office_name',
                'offices.id as office_id',
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderByDesc('venue_bookings.updated_at')
            ->limit(10);

        if (!$isSuperAdmin && $officeId) {
            $vbQuery->where('offices.id', $officeId);
        }

        $vbNotifs = $vbQuery->get()->map(fn ($b) => [
            'id'      => 'vb-' . $b->id,
            'type'    => 'venue_booking',
            'title'   => ($b->venue_name ?? 'AVR') . ' — ' . ucfirst($b->status),
            'message' => ($b->program_office ?? $b->filer_name ?? 'Unknown') . ' | ' . $b->reference_code,
            'office'  => $b->office_name ?? 'FSUU Main',
            'ref'     => $b->reference_code,
            'status'  => $b->status,
            'time'    => Carbon::parse($b->updated_at)->diffForHumans(),
            'raw_time' => $b->updated_at,
        ]);

        // ── Equipment Borrowings ────────────────────────────────────────────────
        $ebQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('offices', 'equipment_borrows.office_id', '=', 'offices.id')
            ->whereNull('equipment_borrows.archived_at')
            ->select(
                'equipment_borrows.id',
                'equipment_borrows.filer_name',
                'equipment_borrows.program_office',
                'equipment_borrows.created_at',
                'equipment_borrows.updated_at',
                'offices.name as office_name',
                'offices.id as office_id',
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderByDesc('equipment_borrows.updated_at')
            ->limit(10);

        if (!$isSuperAdmin && $officeId) {
            $ebQuery->where('equipment_borrows.office_id', $officeId);
        }

        $ebNotifs = $ebQuery->get()->map(fn ($b) => [
            'id'      => 'eb-' . $b->id,
            'type'    => 'equipment_borrow',
            'title'   => 'Equipment Borrow — ' . ucfirst($b->status),
            'message' => ($b->program_office ?? $b->filer_name ?? 'Unknown') . ' | ' . $b->reference_code,
            'office'  => $b->office_name ?? 'FSUU Main',
            'ref'     => $b->reference_code,
            'status'  => $b->status,
            'time'    => Carbon::parse($b->updated_at)->diffForHumans(),
            'raw_time' => $b->updated_at,
        ]);

        $all = $vbNotifs->concat($ebNotifs)
            ->sortByDesc('raw_time')
            ->take(20)
            ->values();

        return response()->json($all);
    }
}
