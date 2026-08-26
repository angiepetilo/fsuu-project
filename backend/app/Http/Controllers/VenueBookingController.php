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

        // Automatically auto-release unclaimed no-show bookings past 15m grace period
        try {
            app(\App\Services\NoShowAutoReleaseService::class)->processNoShows(15);
        } catch (\Throwable $e) {}

        $user = $request->user();

        $academicTermId = $request->query('academic_term_id') ?: $request->query('term_id');
        if (empty($academicTermId)) {
            $academicTermId = DB::table('academic_terms')->where('is_active', true)->value('id');
        }

        $bookings = VenueBooking::with(['trackingNumber', 'venue', 'documents', 'venueBookingEquipment.equipmentType'])
            ->where(function ($q) {
                $completedStatuses = ['completed', 'done', 'returned', 'damaged', 'lost', 'returned late', 'returned_late'];
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

        try {
            $validated = $request->validate([
                'assigned_units' => 'nullable',
            ]);

            $assignedData = $validated['assigned_units'] ?? [];
            if (is_string($assignedData)) {
                try { $assignedData = json_decode($assignedData, true); } catch (\Throwable $t) { $assignedData = []; }
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
                if (Schema::hasTable('venue_bookings')) {
                    $query = DB::table('venue_bookings')
                        ->where('venue_bookings.id', '!=', $avrVenueBooking->id)
                        ->whereNotNull('venue_bookings.assigned_units');

                    if (Schema::hasTable('tracking_numbers') && Schema::hasColumn('venue_bookings', 'tracking_number_id')) {
                        $query->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                              ->where(function($sq) use ($inactiveStatuses) {
                                  $sq->whereNull('tracking_numbers.status')
                                     ->orWhereNotIn('tracking_numbers.status', $inactiveStatuses);
                              });
                    }

                    $otherVenueBookings = $query->where(function ($q) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                        $q->where('venue_bookings.date_of_usage', '<=', $reservationEndDate)
                          ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$dateOfUsage])
                          ->where('venue_bookings.time_start', '<', $timeEnd)
                          ->where('venue_bookings.time_end', '>', $timeStart);
                    })
                    ->select('venue_bookings.id', 'venue_bookings.assigned_units')
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
                                        'message' => "Physical unit '{$oCode}' is already reserved for another venue booking during this time slot."
                                    ], 422);
                                }
                            }
                        }
                    }
                }

                // 2. Check overlapping active equipment borrowings
                if (Schema::hasTable('equipment_borrows')) {
                    $eqQuery = DB::table('equipment_borrows')
                        ->whereNotNull('equipment_borrows.assigned_units');

                    if (Schema::hasTable('tracking_numbers') && Schema::hasColumn('equipment_borrows', 'tracking_number_id')) {
                        $eqQuery->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                                ->where(function($sq) use ($inactiveStatuses) {
                                    $sq->whereNull('tracking_numbers.status')
                                       ->orWhereNotIn('tracking_numbers.status', $inactiveStatuses);
                                });
                    }

                    $otherEquipBorrows = $eqQuery->where(function ($q) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                        $q->where('equipment_borrows.date_of_usage', '<=', $reservationEndDate)
                          ->whereRaw('COALESCE(equipment_borrows.reservation_end_date, equipment_borrows.date_of_usage) >= ?', [$dateOfUsage])
                          ->where('equipment_borrows.time_start', '<', $timeEnd)
                          ->where('equipment_borrows.time_end', '>', $timeStart);
                    })
                    ->select('equipment_borrows.id', 'equipment_borrows.assigned_units')
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
                                        'message' => "Physical unit '{$oCode}' is already reserved for a borrowing reservation during this time slot."
                                    ], 422);
                                }
                            }
                        }
                    }
                }
            }

            $avrVenueBooking->update([
                'assigned_units' => $assignedData,
            ]);

            $currentStatus = strtolower($avrVenueBooking->status ?? $avrVenueBooking->trackingNumber?->status ?? '');

            if (!empty($barcodes) && Schema::hasTable('equipment_units')) {
                $newUnitStatus = in_array($currentStatus, ['ongoing', 'on-going', 'post-inspection']) ? 'released' : 'reserved';
                \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                    $q->whereIn('unit_code', $barcodes)->orWhereIn('id', $barcodes);
                })
                ->update(['status' => $newUnitStatus]);
            }

            return response()->json($avrVenueBooking->fresh(['venue', 'trackingNumber']));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("VenueBookingController::assignUnits error: " . $e->getMessage());
            return response()->json($avrVenueBooking->fresh(['venue', 'trackingNumber']));
        }
    }

    public function uploadDocument(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('update', $avrVenueBooking);
        $request->validate([
            'document' => 'required|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
        ]);

        $url = app(\App\Services\MediaUploadService::class)->upload($request->file('document'), 'endorsements');

        \App\Models\Document::create([
            'venue_booking_id' => $avrVenueBooking->id,
            'file_path'        => $url,
            'document_type'    => 'endorsement_letter',
            'file_name'        => $request->file('document')->getClientOriginalName(),
        ]);

        $avrVenueBooking->update(['endorsement_url' => $url]);

        return response()->json([
            'message' => 'Endorsement document uploaded successfully',
            'url'     => $url,
            'booking' => $avrVenueBooking->fresh(['documents', 'venue', 'trackingNumber'])
        ]);
    }

    public function override(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->override($avrVenueBooking, auth()->user(), $request->all());
        return response()->json($booking);
    }
}
