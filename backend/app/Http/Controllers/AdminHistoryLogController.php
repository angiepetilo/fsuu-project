<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminHistoryLogController extends Controller
{
    /**
     * GET /admin/history-log?type=venue|equipment
     * Returns completed/done venue bookings and equipment borrowings.
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'all'); // 'venue' | 'equipment' | 'all'
        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : true;
        $officeId = $user ? $user->office_id : null;

        $venueBookings       = collect();
        $equipmentBorrowings = collect();

        // ── Venue Bookings ──────────────────────────────────────────────────────
        if (in_array($type, ['venue', 'all'])) {
            $vbQuery = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
                ->whereNull('venue_bookings.archived_at')
                ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['completed', 'solved', 'done'])
                ->select(
                    'venue_bookings.id',
                    'venue_bookings.filer_name',
                    'venue_bookings.program_office',
                    'venue_bookings.email_address',
                    'venue_bookings.date_of_usage',
                    'venue_bookings.time_start',
                    'venue_bookings.time_end',
                    'venue_bookings.purpose',
                    'venue_bookings.classification',
                    'venue_bookings.contact_number as contact_no',
                    'venues.name as venue_name',
                    'offices.name as office_name',
                    'offices.id as office_id',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status',
                    'venue_bookings.created_at',
                    'venue_bookings.updated_at'
                )
                ->orderByDesc('venue_bookings.created_at');

            if (!$isSuperAdmin && $officeId) {
                $vbQuery->where('offices.id', $officeId);
            }

            $venueBookings = $vbQuery->get()->map(fn ($b) => (array) $b + ['record_type' => 'venue']);
        }

        // ── Equipment Borrowings ────────────────────────────────────────────────
        if (in_array($type, ['equipment', 'all'])) {
            $ebQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('offices', 'equipment_borrows.office_id', '=', 'offices.id')
                ->whereNull('equipment_borrows.archived_at')
                ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['completed', 'solved', 'done'])
                ->select(
                    'equipment_borrows.id',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.program_office',
                    'equipment_borrows.email_address',
                    'equipment_borrows.date_of_usage',
                    'equipment_borrows.time_start',
                    'equipment_borrows.time_end',
                    'equipment_borrows.purpose',
                    'equipment_borrows.contact_number as contact_no',
                    'offices.name as office_name',
                    'offices.id as office_id',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status',
                    'equipment_borrows.created_at',
                    'equipment_borrows.updated_at'
                )
                ->orderByDesc('equipment_borrows.created_at');

            if (!$isSuperAdmin && $officeId) {
                $ebQuery->where('equipment_borrows.office_id', $officeId);
            }

            $equipmentBorrowings = $ebQuery->get()->map(fn ($b) => (array) $b + ['record_type' => 'equipment']);
        }


        if ($type === 'venue') {
            return response()->json(['venue_bookings' => $venueBookings, 'equipment_borrowings' => []]);
        }
        if ($type === 'equipment') {
            return response()->json(['venue_bookings' => [], 'equipment_borrowings' => $equipmentBorrowings]);
        }

        return response()->json([
            'venue_bookings'       => $venueBookings,
            'equipment_borrowings' => $equipmentBorrowings,
        ]);
    }

    /**
     * DELETE /admin/history-log/venue/{id}   — soft delete a venue booking record
     * DELETE /admin/history-log/equipment/{id} — soft delete an equipment borrow record
     */
    public function destroyVenue(int $id): JsonResponse
    {
        DB::table('venue_bookings')
            ->where('id', $id)
            ->whereNull('archived_at')
            ->update(['archived_at' => now()]);

        return response()->json(['message' => 'Venue booking archived from history']);
    }

    public function destroyEquipment(int $id): JsonResponse
    {
        DB::table('equipment_borrows')
            ->where('id', $id)
            ->whereNull('archived_at')
            ->update(['archived_at' => now()]);

        return response()->json(['message' => 'Equipment borrow archived from history']);
    }
}
