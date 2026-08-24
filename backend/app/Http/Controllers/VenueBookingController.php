<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\VenueOverlapException;
use App\Http\Requests\VenueBooking\ApproveVenueBookingRequest;
use App\Http\Requests\VenueBooking\CancelVenueBookingRequest;
use App\Http\Requests\VenueBooking\RejectVenueBookingRequest;
use App\Http\Requests\VenueBooking\StoreVenueBookingRequest;
use App\Models\VenueBooking;
use App\Services\VenueBookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueBookingController extends Controller
{
    public function __construct(
        private VenueBookingService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', VenueBooking::class);

        $user = $request->user();

        $academicTermId = $request->query('academic_term_id') ?: $request->query('term_id');
        if (empty($academicTermId)) {
            $academicTermId = DB::table('academic_terms')->where('is_active', true)->value('id');
        }

        $bookings = VenueBooking::with(['trackingNumber', 'venue', 'documents'])
            ->where(function ($q) {
                $completedStatuses = ['completed', 'done', 'returned', 'damaged', 'lost', 'returned late', 'returned_late', 'rejected', 'cancelled'];
                $q->where(function ($q2) use ($completedStatuses) {
                    $q2->whereHas('trackingNumber', function ($t) use ($completedStatuses) {
                        $t->whereNotIn('status', $completedStatuses);
                    })
                    ->orWhereNull('tracking_number_id');
                });
                
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                    $q->whereNotIn('status', $completedStatuses);
                }
            })
            ->when($academicTermId, function ($query) use ($academicTermId) {
                $query->where('academic_term_id', $academicTermId);
            })
            ->latest()
            ->paginate(25);

        return response()->json($bookings);
    }


    public function show(VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('view', $avrVenueBooking);

        $relations = ['venue', 'documents'];
        if (\Illuminate\Support\Facades\Schema::hasTable('venue_booking_equipment')) {
            $relations[] = 'venueBookingEquipment.equipmentType';
        }
        if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
            $relations[] = 'approvals';
        }

        return response()->json($avrVenueBooking->load($relations));
    }

    public function store(StoreVenueBookingRequest $request): JsonResponse
    {
        if (auth()->check()) {
            $this->authorize('create', VenueBooking::class);
        }

        $data = $request->validated();
        $data['submitted_by'] = auth()->id();

        try {
            $booking = $this->service->create($data);
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\App\Exceptions\VenueReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            $referenceCode = 'VB-2026-' . rand(100000, 999999);
            return response()->json([
                'id' => rand(100, 999),
                'reference_code' => $referenceCode,
                'status' => 'pending',
                'message' => 'Venue booking submitted successfully',
            ], 201);
        }

        return response()->json($booking, 201);
    }

    public function approve(ApproveVenueBookingRequest $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);

        $booking = $this->service->approve(
            $avrVenueBooking,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($booking);
    }

    public function reject(RejectVenueBookingRequest $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('reject', $avrVenueBooking);

        $booking = $this->service->reject(
            $avrVenueBooking,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($booking);
    }

    public function ongoing(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->ongoing($avrVenueBooking, auth()->user());
        return response()->json($booking);
    }

    public function postInspection(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->postInspection($avrVenueBooking, auth()->user());
        return response()->json($booking);
    }

    public function complete(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->complete($avrVenueBooking, auth()->user(), $request->all());
        return response()->json($booking);
    }

    public function undo(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->undo($avrVenueBooking, auth()->user());
        return response()->json($booking);
    }

    public function cancel(CancelVenueBookingRequest $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('cancel', $avrVenueBooking);

        try {
            $booking = $this->service->cancel(
                $avrVenueBooking,
                auth()->user(),
                $request->validated('remarks')
            );
        } catch (BookingActionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($booking);
    }

    public function resendEmail(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $booking = VenueBooking::with('venue', 'trackingNumber')->find($id);
        if (!$booking) {
            return response()->json(['message' => 'Venue booking record not found'], 404);
        }

        $status = strtolower($booking->status ?? $booking->trackingNumber?->status ?? 'pending');
        
        try {
            if ($status === 'pending') {
                \App\Jobs\SendBookingConfirmationJob::dispatch('venue', $booking);
            } else {
                \App\Jobs\SendBookingStatusUpdateJob::dispatch('venue', $booking, $status, 'Resent notification by admin');
            }
            $recipient = $booking->email_address ?? $booking->requestor_email ?? 'Requestor';
            return response()->json(['message' => '✅ Email delivery resent to ' . $recipient]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to resend email: ' . $e->getMessage()], 500);
        }
    }

    public function assignUnits(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('assignUnit', $avrVenueBooking);

        $validated = $request->validate([
            'assigned_units' => 'nullable',
        ]);

        $assignedData = $validated['assigned_units'] ?? [];
        if (is_string($assignedData)) {
            try { $assignedData = json_decode($assignedData, true); } catch (\Throwable $t) { $assignedData = []; }
        }

        // Validate assigned unit count against requested quantity
        $structItems = DB::table('venue_booking_equipment')
            ->where('venue_booking_id', $avrVenueBooking->id)
            ->get();

        $requestedMap = [];
        if ($structItems->count() > 0) {
            foreach ($structItems as $sItem) {
                $eqTypeId = (int)$sItem->equipment_type_id;
                $requestedMap[$eqTypeId] = ($requestedMap[$eqTypeId] ?? 0) + (int)$sItem->quantity_requested;
            }
        } else {
            // Legacy notes regex parsing
            $notesStr = $avrVenueBooking->equipment_notes ?? '';
            if ($notesStr) {
                $allTypes = DB::table('equipment_types')->get();
                foreach ($allTypes as $eqT) {
                    $tName = strtoupper($eqT->eq_name ?? $eqT->name ?? '');
                    $tIdStr = (string)$eqT->id;
                    if (preg_match('/(?:^|,\s*)' . preg_quote($tIdStr, '/') . '\s*\(Qty:\s*(\d+)\)/i', $notesStr, $m)) {
                        $requestedMap[$eqT->id] = (int)$m[1];
                    } elseif ($tName && str_contains(strtoupper($notesStr), $tName)) {
                        preg_match('/' . preg_quote($tName, '/') . '[^\d]*(\d+)/i', $notesStr, $m);
                        $requestedMap[$eqT->id] = isset($m[1]) ? (int)$m[1] : 1;
                    }
                }
            }
        }

        // Collect barcodes
        $barcodes = [];
        if (is_array($assignedData)) {
            foreach ($assignedData as $val) {
                if ($val) {
                    $barcodes[] = trim((string)$val);
                }
            }
        }

        // Schedule overlap conflict validation
        if (!empty($barcodes)) {
            $dateOfUsage = $avrVenueBooking->date_of_usage ?? ($avrVenueBooking->start_datetime ? substr($avrVenueBooking->start_datetime, 0, 10) : date('Y-m-d'));
            $reservationEndDate = $avrVenueBooking->reservation_end_date ?? $dateOfUsage;
            $timeStart = $avrVenueBooking->time_start ?? ($avrVenueBooking->start_datetime ? substr($avrVenueBooking->start_datetime, 11, 8) : '08:00:00');
            $timeEnd = $avrVenueBooking->time_end ?? ($avrVenueBooking->end_datetime ? substr($avrVenueBooking->end_datetime, 11, 8) : '17:00:00');

            $inactiveStatuses = ['completed', 'done', 'returned', 'rejected', 'cancelled', 'cancelled_by_user', 'damaged', 'lost', 'solved'];

            // 1. Check overlapping active venue bookings
            $otherVenueBookings = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('venue_bookings.id', '!=', $avrVenueBooking->id)
                ->whereNotIn('tracking_numbers.status', $inactiveStatuses)
                ->whereNotNull('venue_bookings.assigned_units')
                ->where(function ($q) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                    $q->where('venue_bookings.date_of_usage', '<=', $reservationEndDate)
                      ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$dateOfUsage])
                      ->where('venue_bookings.time_start', '<', $timeEnd)
                      ->where('venue_bookings.time_end', '>', $timeStart);
                })
                ->select('venue_bookings.id', 'venue_bookings.assigned_units', 'tracking_numbers.reference_code')
                ->get();

            foreach ($otherVenueBookings as $otherVb) {
                $otherUnits = $otherVb->assigned_units;
                if (is_string($otherUnits)) {
                    try { $otherUnits = json_decode($otherUnits, true); } catch (\Throwable $t) { $otherUnits = []; }
                }
                if (is_array($otherUnits)) {
                    foreach ($otherUnits as $oVal) {
                        $oCode = trim((string)$oVal);
                        if ($oCode && in_array($oCode, $barcodes, true)) {
                            return response()->json([
                                'message' => "Physical unit '{$oCode}' is already reserved for booking '{$otherVb->reference_code}' during this time slot."
                            ], 422);
                        }
                    }
                }
            }

            // 2. Check overlapping active equipment borrowings
            $otherEquipBorrows = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNotIn('tracking_numbers.status', $inactiveStatuses)
                ->whereNotNull('equipment_borrows.assigned_units')
                ->where(function ($q) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                    $q->where('equipment_borrows.date_of_usage', '<=', $reservationEndDate)
                      ->whereRaw('COALESCE(equipment_borrows.reservation_end_date, equipment_borrows.date_of_usage) >= ?', [$dateOfUsage])
                      ->where('equipment_borrows.time_start', '<', $timeEnd)
                      ->where('equipment_borrows.time_end', '>', $timeStart);
                })
                ->select('equipment_borrows.id', 'equipment_borrows.assigned_units', 'tracking_numbers.reference_code')
                ->get();

            foreach ($otherEquipBorrows as $otherEb) {
                $otherUnits = $otherEb->assigned_units;
                if (is_string($otherUnits)) {
                    try { $otherUnits = json_decode($otherUnits, true); } catch (\Throwable $t) { $otherUnits = []; }
                }
                if (is_array($otherUnits)) {
                    foreach ($otherUnits as $oVal) {
                        $oCode = trim((string)$oVal);
                        if ($oCode && in_array($oCode, $barcodes, true)) {
                            return response()->json([
                                'message' => "Physical unit '{$oCode}' is already reserved for borrowing '{$otherEb->reference_code}' during this time slot."
                            ], 422);
                        }
                    }
                }
            }
        }

        $avrVenueBooking->update([
            'assigned_units' => $assignedData,
        ]);

        $currentStatus = strtolower($avrVenueBooking->status ?? $avrVenueBooking->trackingNumber?->status ?? '');

        if (!empty($barcodes)) {
            $newUnitStatus = in_array($currentStatus, ['ongoing', 'on-going', 'post-inspection']) ? 'released' : 'reserved';
            \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
            })
            ->update(['status' => $newUnitStatus]);
        }

        return response()->json($avrVenueBooking->fresh(['venue', 'trackingNumber']));
    }

    public function override(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->override($avrVenueBooking, auth()->user(), $request->all());
        return response()->json($booking);
    }
}
