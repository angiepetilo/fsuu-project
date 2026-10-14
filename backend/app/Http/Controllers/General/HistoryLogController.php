<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Services\HistoryLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

            $includeArchived = $request->boolean('include_archived', false) || $request->boolean('for_reports', false);

            $venueBookings       = in_array($type, ['venue', 'all']) 
                ? $this->historyService->getVenueBookingsHistory(null, true, $academicTermId, $includeArchived) 
                : collect();

            $equipmentBorrowings = in_array($type, ['equipment', 'all']) 
                ? $this->historyService->getEquipmentBorrowingsHistory(null, true, $academicTermId, $includeArchived) 
                : collect();

            $incidents           = in_array($type, ['incidents', 'all'])
                ? $this->historyService->getIncidentsHistory(null, true, $academicTermId, $includeArchived)
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

    /**
     * POST /general/history-log/clear — archive historical records for venue and/or equipment
     */
    public function clear(Request $request): JsonResponse
    {
        try {
            $type = $request->input('type', 'all'); // 'venue' | 'equipment' | 'all'
            $termId = $request->input('academic_term_id');

            $activeStatuses = ['pending', 'approved', 'ongoing', 'on-going', 'post-inspection', 'reserved'];

            if (in_array($type, ['venue', 'all'])) {
                $vbQuery = DB::table('venue_bookings')
                    ->whereNull('archived_at')
                    ->where(function ($q) use ($activeStatuses) {
                        $q->whereNotIn(DB::raw('LOWER(TRIM(status))'), $activeStatuses)
                          ->orWhereNull('status');
                    });
                if ($termId) {
                    $vbQuery->where('academic_term_id', $termId);
                }
                $vbQuery->update(['archived_at' => now()]);
            }

            if (in_array($type, ['equipment', 'all'])) {
                $ebQuery = DB::table('equipment_borrows')
                    ->whereNull('archived_at')
                    ->where(function ($q) use ($activeStatuses) {
                        $q->whereNotIn(DB::raw('LOWER(TRIM(status))'), $activeStatuses)
                          ->orWhereNull('status');
                    });
                if ($termId) {
                    $ebQuery->where('academic_term_id', $termId);
                }
                $ebQuery->update(['archived_at' => now()]);
            }

            return response()->json(['message' => 'History log cleared successfully.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to clear history log: ' . $e->getMessage()], 500);
        }
    }
}
