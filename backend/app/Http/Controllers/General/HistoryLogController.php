<?php

namespace App\Http\Controllers\General;

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
     * GET /general/history-log?type=venue|equipment
     * Returns completed/done venue bookings and equipment borrowings.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $type = $request->query('type', 'all'); // 'venue' | 'equipment' | 'all'
            $termParam = $request->query('academic_term_id', $request->query('term_id'));
            if ($termParam === 'all' || $termParam === '' || $termParam === '0') {
                $academicTermId = null; // Show all terms (archived + active)
            } elseif (is_numeric($termParam)) {
                $academicTermId = (int)$termParam;
            } else {
                $academicTermId = DB::table('academic_terms')->where('is_active', true)->value('id');
                $academicTermId = $academicTermId ? (int)$academicTermId : null;
            }

            $venueBookings       = in_array($type, ['venue', 'all']) 
                ? $this->historyService->getVenueBookingsHistory(null, true, $academicTermId) 
                : collect();

            $equipmentBorrowings = in_array($type, ['equipment', 'all']) 
                ? $this->historyService->getEquipmentBorrowingsHistory(null, true, $academicTermId) 
                : collect();

            $incidents           = in_array($type, ['incidents', 'all'])
                ? $this->historyService->getIncidentsHistory(null, true, $academicTermId)
                : collect();

            if ($type === 'venue') {
                return response()->json(['venue_bookings' => $venueBookings, 'equipment_borrowings' => [], 'incidents' => []]);
            }
            if ($type === 'equipment') {
                return response()->json(['venue_bookings' => [], 'equipment_borrowings' => $equipmentBorrowings, 'incidents' => []]);
            }
            if ($type === 'incidents') {
                return response()->json(['venue_bookings' => [], 'equipment_borrowings' => [], 'incidents' => $incidents]);
            }

            return response()->json([
                'venue_bookings'       => $venueBookings,
                'equipment_borrowings' => $equipmentBorrowings,
                'incidents'            => $incidents,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'venue_bookings'       => [],
                'equipment_borrowings' => [],
                'incidents'            => [],
                'error'                => $e->getMessage()
            ], 200);
        }
    }

    /**
     * POST /general/history-log/undo
     * Reverts a venue booking or equipment borrow to its prior active state (pending or on-going).
     */
    public function undo(Request $request): JsonResponse
    {
        try {
            $id = $request->input('id');
            $type = $request->input('type', 'venue');

            if ($type === 'venue') {
                $booking = DB::table('venue_bookings')->where('id', $id)->first();
                if ($booking) {
                    $tracking = DB::table('tracking_numbers')
                        ->where('id', $booking->tracking_number_id)
                        ->orWhere('reference_code', $booking->reference_code ?? '')
                        ->first();
                    $currentStatus = $tracking ? strtolower($tracking->status) : strtolower($booking->status);
                    $newStatus = in_array($currentStatus, ['rejected', 'cancelled', 'cancelled_by_user']) ? 'pending' : 'on-going';

                    if (Schema::hasColumn('venue_bookings', 'status')) {
                        DB::table('venue_bookings')->where('id', $id)->update(['status' => $newStatus]);
                    }
                    DB::table('tracking_numbers')
                        ->where('id', $booking->tracking_number_id)
                        ->orWhere('reference_code', $booking->reference_code ?? '')
                        ->update(['status' => $newStatus]);
                }
            } else {
                $borrow = DB::table('equipment_borrows')->where('id', $id)->first();
                if ($borrow) {
                    $tracking = DB::table('tracking_numbers')
                        ->where('id', $borrow->tracking_number_id)
                        ->orWhere('reference_code', $borrow->reference_code ?? '')
                        ->first();
                    $currentStatus = $tracking ? strtolower($tracking->status) : strtolower($borrow->status);
                    $newStatus = in_array($currentStatus, ['rejected', 'cancelled', 'cancelled_by_user']) ? 'pending' : 'on-going';

                    if (Schema::hasColumn('equipment_borrows', 'status')) {
                        DB::table('equipment_borrows')->where('id', $id)->update(['status' => $newStatus]);
                    }
                    DB::table('tracking_numbers')
                        ->where('id', $borrow->tracking_number_id)
                        ->orWhere('reference_code', $borrow->reference_code ?? '')
                        ->update(['status' => $newStatus]);
                }
            }

            return response()->json(['message' => 'Record successfully reverted!', 'new_status' => $newStatus ?? 'pending']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to revert record.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /general/history-log/venue/{id} — soft delete a venue booking record
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
     * DELETE /general/history-log/equipment/{id} — soft delete an equipment borrow record
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
