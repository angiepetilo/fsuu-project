<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\HistoryLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HistoryLogController extends Controller
{
    public function __construct(
        protected HistoryLogService $historyService
    ) {}

    /**
     * GET /admin/history-log?type=venue|equipment
     * Returns completed/done venue bookings and equipment borrowings.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $type = $request->query('type', 'all'); // 'venue' | 'equipment' | 'all'
            $academicTermId = $request->query('academic_term_id') ?: $request->query('term_id');
            $academicTermId = $academicTermId && is_numeric($academicTermId) ? (int)$academicTermId : null;

            $user = $request->user();
            $isSuperAdmin = $user ? $user->isSuperAdmin() : true;
            $officeId = $user ? $user->office_id : null;

            $venueBookings       = in_array($type, ['venue', 'all']) 
                ? $this->historyService->getVenueBookingsHistory($officeId, $isSuperAdmin, $academicTermId) 
                : collect();

            $equipmentBorrowings = in_array($type, ['equipment', 'all']) 
                ? $this->historyService->getEquipmentBorrowingsHistory($officeId, $isSuperAdmin, $academicTermId) 
                : collect();

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
        } catch (\Throwable $e) {
            return response()->json([
                'venue_bookings'       => [],
                'equipment_borrowings' => [],
                'error'                => $e->getMessage()
            ], 200);
        }
    }

    /**
     * POST /admin/history-log/undo
     * Reverts a venue booking or equipment borrow from completed/damaged back to on-going.
     */
    public function undo(Request $request): JsonResponse
    {
        try {
            $id = $request->input('id');
            $type = $request->input('type', 'venue');

            if ($type === 'venue') {
                $booking = DB::table('venue_bookings')->where('id', $id)->first();
                if ($booking) {
                    if (Schema::hasColumn('venue_bookings', 'status')) {
                        DB::table('venue_bookings')->where('id', $id)->update(['status' => 'on-going']);
                    }
                    DB::table('tracking_numbers')
                        ->where('id', $booking->tracking_number_id)
                        ->orWhere('reference_code', $booking->reference_code ?? '')
                        ->update(['status' => 'on-going']);
                }
            } else {
                $borrow = DB::table('equipment_borrows')->where('id', $id)->first();
                if ($borrow) {
                    if (Schema::hasColumn('equipment_borrows', 'status')) {
                        DB::table('equipment_borrows')->where('id', $id)->update(['status' => 'on-going']);
                    }
                    DB::table('tracking_numbers')
                        ->where('id', $borrow->tracking_number_id)
                        ->orWhere('reference_code', $borrow->reference_code ?? '')
                        ->update(['status' => 'on-going']);
                }
            }

            return response()->json(['message' => 'Record successfully reverted back to ON-GOING status!']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to revert record.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /admin/history-log/venue/{id} — soft delete a venue booking record
     */
    public function destroyVenue($id): JsonResponse
    {
        try {
            DB::table('venue_bookings')->where('id', $id)->update(['archived_at' => now()]);
            return response()->json(['message' => 'Venue history record archived.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to archive record.'], 500);
        }
    }

    /**
     * DELETE /admin/history-log/equipment/{id} — soft delete an equipment borrow record
     */
    public function destroyEquipment($id): JsonResponse
    {
        try {
            DB::table('equipment_borrows')->where('id', $id)->update(['archived_at' => now()]);
            return response()->json(['message' => 'Equipment history record archived.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to archive record.'], 500);
        }
    }
}
