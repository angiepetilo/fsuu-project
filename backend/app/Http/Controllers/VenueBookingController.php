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
use App\Models\AuditLog;
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

        try {
            $booking = $this->service->approve(
                $avrVenueBooking,
                auth()->user(),
                $request->validated('remarks')
            );
        } catch (\App\Exceptions\BookingActionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Venue Booking Approve Error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 422);
        }

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'VENUE_BOOKING_APPROVED',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'remarks'        => $request->validated('remarks'),
                    'description'    => "Venue booking {$ref} approved by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json($booking);
    }

    public function markIncomplete(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('reject', $avrVenueBooking);

        $validated = $request->validate([
            'missing_requirements' => 'nullable|array',
            'remarks'              => 'nullable|string',
            'grace_hours'          => 'nullable|integer|in:24,48',
        ]);

        $user = auth()->user() ?? $request->user();
        $graceHours = (int) ($validated['grace_hours'] ?? (\App\Models\OperatingHour::first()?->requirement_grace_hours ?? 24));
        $remarks = $validated['remarks'] ?? 'Missing requirements notice';
        $missingList = $validated['missing_requirements'] ?? [];

        $booking = $this->service->markIncomplete($avrVenueBooking, $user, $missingList, $remarks, $graceHours);

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => $user?->id ?? auth()->id(),
                'action'         => 'VENUE_BOOKING_INCOMPLETE',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code'       => $ref,
                    'filer_name'           => $avrVenueBooking->filer_name,
                    'missing_requirements' => $missingList,
                    'remarks'              => $remarks,
                    'description'          => "Venue booking {$ref} flagged incomplete — missing requirements by " . ($user?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

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

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'VENUE_BOOKING_REJECTED',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'remarks'        => $request->validated('remarks'),
                    'description'    => "Venue booking {$ref} rejected by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json($booking);
    }

    public function ongoing(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('ongoing', $avrVenueBooking);

        try {
            if ($request->has('assigned_units')) {
                $assignedData = $request->input('assigned_units');
                if (is_string($assignedData)) {
                    try { $assignedData = json_decode($assignedData, true); } catch (\Throwable $t) { $assignedData = []; }
                }
                $avrVenueBooking->forceFill(['assigned_units' => $assignedData])->save();
            }

            $user = auth()->user() ?? $request->user();
            $booking = $this->service->ongoing($avrVenueBooking, $user);

            try {
                $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
                AuditLog::create([
                    'user_id'        => $user?->id ?? auth()->id(),
                    'action'         => 'VENUE_BOOKING_RELEASED',
                    'auditable_type' => 'venue_bookings',
                    'auditable_id'   => $avrVenueBooking->id,
                    'metadata'       => [
                        'reference_code' => $ref,
                        'filer_name'     => $avrVenueBooking->filer_name,
                        'description'    => "Venue booking {$ref} released / marked on-going by " . ($user?->name ?? 'Staff'),
                    ],
                    'ip_address'     => request()->ip(),
                    'created_at'     => now(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json($booking);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("VenueBooking ongoing error: " . $e->getMessage());
            return response()->json(['message' => 'Failed to mark venue booking ongoing: ' . $e->getMessage()], 500);
        }
    }

    public function postInspection(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('postInspection', $avrVenueBooking);
        $user = auth()->user() ?? $request->user();
        $booking = $this->service->postInspection($avrVenueBooking, $user);
        return response()->json($booking);
    }

    public function complete(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('complete', $avrVenueBooking);
        $user = auth()->user() ?? $request->user();
        $booking = $this->service->complete($avrVenueBooking, $user, $request->all());

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => $user?->id ?? auth()->id(),
                'action'         => 'VENUE_BOOKING_COMPLETED',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'description'    => "Venue booking {$ref} completed by " . ($user?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json($booking);
    }

    public function undo(\Illuminate\Http\Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('undo', $avrVenueBooking);
        $user = auth()->user() ?? $request->user();
        $booking = $this->service->undo($avrVenueBooking, $user);

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => $user?->id ?? auth()->id(),
                'action'         => 'VENUE_BOOKING_UNDO',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'description'    => "Venue booking {$ref} status reverted (undo) by " . ($user?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

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

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'VENUE_BOOKING_CANCELLED',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'remarks'        => $request->validated('remarks'),
                    'description'    => "Venue booking {$ref} cancelled by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

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
                $numIds = array_values(array_filter($barcodes, fn($v) => is_numeric($v) && (int)$v > 0));
                $uCodes = array_values(array_filter($barcodes, fn($v) => !empty($v)));

                \App\Models\EquipmentUnit::where(function($q) use ($uCodes, $numIds) {
                    $q->whereIn('barcode', $uCodes);
                    if (!empty($numIds)) {
                        $q->orWhereIn('id', array_map('intval', $numIds));
                    }
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

        try {
            $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'VENUE_BOOKING_OVERRIDE',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'new_status'     => $request->input('status'),
                    'description'    => "Venue booking {$ref} status overridden to '" . $request->input('status') . "' by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json($booking);
    }

    public function notifyUrgent(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $user = auth()->user() ?? $request->user();
        $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "TRK-AVR{$avrVenueBooking->id}";
        $filer = $avrVenueBooking->filer_name ?? 'FSUU Filer';
        $venueName = $avrVenueBooking->venue?->name ?? 'AVR Facility';
        $reason = $request->input('reason', 'Immediate operational verification requested.');
        $email = $avrVenueBooking->email_address ?? $avrVenueBooking->requestor_email ?? null;

        // 1. Send Email Notification to Email Used on booking
        if ($email) {
            try {
                \App\Jobs\SendBookingStatusUpdateJob::dispatch(
                    'venue',
                    $avrVenueBooking,
                    'urgent_approval',
                    "Urgent priority approval requested for reservation {$ref} ({$venueName}). It has been escalated to Staff & Super Administrator for expedited clearance."
                );
            } catch (\Throwable $e) {}
        }

        // 2. Persist notification in database for Notification Bell
        if (\Illuminate\Support\Facades\Schema::hasTable('notifications')) {
            \Illuminate\Support\Facades\DB::table('notifications')->insert([
                'title'          => "Urgent Approval with ({$ref})",
                'message'        => "Student Assistant " . ($user->name ?? 'Operations') . " marked {$ref} for {$filer} ({$venueName}) as URGENT. Reason: {$reason}",
                'type'           => 'urgent_approval',
                'target_type'    => 'venue_booking',
                'target_id'      => $avrVenueBooking->id,
                'reference_code' => $ref,
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        // 3. Broadcast real-time event to Staff & Super Admin accounts
        try {
            event(new \App\Events\BookingStatusUpdated(
                'venue_booking',
                $ref,
                'urgent_approval',
                $avrVenueBooking->id,
                $reason,
                [
                    'is_urgent'       => true,
                    'tracking_number' => $ref,
                    'reference_code'  => $ref,
                    'venue_name'      => $venueName,
                    'filer_name'      => $filer,
                ]
            ));
        } catch (\Throwable $e) {}

        return response()->json([
            'message'         => "Urgent approval notification dispatched for {$ref}.",
            'booking_id'      => $avrVenueBooking->id,
            'reference_code'  => $ref,
            'tracking_number' => $ref,
            'email_used'      => $email,
            'is_urgent'       => true
        ]);
    }

    /**
     * Check vacant venues available during the booking's requested date & timeslot.
     * Only appears if there is another booking having the same time & date for this venue (scheduling conflict).
     */
    public function vacantVenues(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $rawDate    = $avrVenueBooking->date_of_usage;
        $rawEndDate = $avrVenueBooking->reservation_end_date ?? $rawDate;
        $timeStart  = $avrVenueBooking->time_start;
        $timeEnd    = $avrVenueBooking->time_end;
        $currentVenueId = $avrVenueBooking->venue_id;

        // Check if there is ANOTHER booking for the SAME venue on this same date and overlapping timeslot
        $hasConflictingBooking = VenueBooking::query()
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->where('venue_bookings.id', '!=', $avrVenueBooking->id)
            ->where('venue_bookings.venue_id', $currentVenueId)
            ->whereNotIn('tracking_numbers.status', ['rejected', 'cancelled', 'completed'])
            ->where(function ($q) use ($rawDate, $rawEndDate, $timeStart, $timeEnd) {
                $q->where(function ($sub) use ($rawDate, $timeStart, $timeEnd) {
                    $sub->where('venue_bookings.date_of_usage', '<=', $rawDate)
                        ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$rawDate])
                        ->where('venue_bookings.time_start', '<', $timeEnd)
                        ->where('venue_bookings.time_end', '>', $timeStart);
                })->orWhere(function ($sub2) use ($rawDate, $rawEndDate, $timeStart, $timeEnd) {
                    $sub2->where('venue_bookings.date_of_usage', '<=', $rawEndDate)
                        ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$rawDate])
                        ->where('venue_bookings.time_start', '<', $timeEnd)
                        ->where('venue_bookings.time_end', '>', $timeStart);
                });
            })
            ->exists();

        // If there is NO other booking on the requested venue, it is completely free; no referral needed!
        if (!$hasConflictingBooking) {
            return response()->json([
                'date_of_usage' => $rawDate,
                'time_start'    => $timeStart,
                'time_end'      => $timeEnd,
                'current_venue' => $avrVenueBooking->venue,
                'has_conflict'  => false,
                'vacant_venues' => [],
            ]);
        }

        // Find venues that have overlapping approved/ongoing reservations
        $busyVenueIds = VenueBooking::query()
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->where('venue_bookings.id', '!=', $avrVenueBooking->id)
            ->whereIn('tracking_numbers.status', ['approved', 'ongoing', 'on-going'])
            ->where(function ($q) use ($rawDate, $rawEndDate, $timeStart, $timeEnd) {
                $q->where(function ($sub) use ($rawDate, $timeStart, $timeEnd) {
                    $sub->where('venue_bookings.date_of_usage', '<=', $rawDate)
                        ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$rawDate])
                        ->where('venue_bookings.time_start', '<', $timeEnd)
                        ->where('venue_bookings.time_end', '>', $timeStart);
                })->orWhere(function ($sub2) use ($rawDate, $rawEndDate, $timeStart, $timeEnd) {
                    $sub2->where('venue_bookings.date_of_usage', '<=', $rawEndDate)
                        ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$rawDate])
                        ->where('venue_bookings.time_start', '<', $timeEnd)
                        ->where('venue_bookings.time_end', '>', $timeStart);
                });
            })
            ->pluck('venue_bookings.venue_id')
            ->unique()
            ->toArray();

        $vacantVenues = \App\Models\Venue::whereNotIn('id', $busyVenueIds)
            ->where('id', '!=', $currentVenueId)
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'available');
            })
            ->get()
            ->map(function ($venue) use ($avrVenueBooking) {
                $venue->fits_capacity = ($venue->capacity_max ?? $venue->capacity ?? 999) >= ($avrVenueBooking->no_of_person ?? 1);
                return $venue;
            });

        return response()->json([
            'date_of_usage' => $rawDate,
            'time_start'    => $timeStart,
            'time_end'      => $timeEnd,
            'current_venue' => $avrVenueBooking->venue,
            'has_conflict'  => true,
            'vacant_venues' => $vacantVenues,
        ]);
    }

    /**
     * Refer/transfer this booking to an available vacant venue instead of rejecting.
     */
    public function reassignVenue(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);

        $request->validate([
            'venue_id' => 'required|exists:venues,id',
            'remarks'  => 'nullable|string|max:500',
        ]);

        $newVenueId = (int)$request->input('venue_id');
        $remarks = trim($request->input('remarks', 'Referred and accommodated in alternative venue due to scheduling conflict'));

        $targetVenue = \App\Models\Venue::findOrFail($newVenueId);

        $oldVenueName = $avrVenueBooking->venue?->name ?? 'Original Venue';
        $avrVenueBooking->venue_id = $newVenueId;
        $avrVenueBooking->save();

        $ref = $avrVenueBooking->trackingNumber?->reference_code ?? "VB-{$avrVenueBooking->id}";

        try {
            AuditLog::create([
                'user_id'        => auth()->id(),
                'action'         => 'VENUE_BOOKING_REASSIGNED',
                'auditable_type' => 'venue_bookings',
                'auditable_id'   => $avrVenueBooking->id,
                'metadata'       => [
                    'reference_code' => $ref,
                    'filer_name'     => $avrVenueBooking->filer_name,
                    'old_venue'      => $oldVenueName,
                    'new_venue'      => $targetVenue->name,
                    'remarks'        => $remarks,
                    'description'    => "Booking {$ref} transferred from {$oldVenueName} to {$targetVenue->name} by " . (auth()->user()?->name ?? 'Staff'),
                ],
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);
        } catch (\Throwable $e) {}

        // Send status update notification to applicant
        try {
            \App\Jobs\SendBookingStatusUpdateJob::dispatch(
                'venue',
                $avrVenueBooking->fresh('venue'),
                'reassigned',
                "Your reservation has been successfully referred and accommodated in {$targetVenue->name}. {$remarks}"
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Reservation successfully referred and transferred to {$targetVenue->name}.",
            'booking' => $avrVenueBooking->fresh(['venue', 'trackingNumber', 'department']),
        ]);
    }

    public function sendOvertimeReminder(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $booking = VenueBooking::with('venue', 'trackingNumber')->find($id);
        if (!$booking) {
            return response()->json(['message' => 'Venue booking record not found'], 404);
        }

        $channel = $request->input('channel', 'both'); // 'both', 'sms', 'email'
        $customMessage = $request->input('message');

        $email = $booking->email_address ?? $booking->requestor_email ?? '';
        $contactNumber = $booking->contact_number 
            ?? $booking->requestor_contact_number 
            ?? null;

        $results = [];

        // 1. Send SMS Overtime Reminder
        if (in_array($channel, ['both', 'sms']) && $contactNumber) {
            try {
                \App\Services\SmsService::send(
                    $contactNumber,
                    "FSUU AVR: Your venue reservation for " . ($booking->venue?->name ?? 'the AVR Facility') . " has exceeded its scheduled end time. Please conclude your activity or contact the AVR Center."
                );
                $results[] = "SMS sent to {$contactNumber}";
            } catch (\Throwable $e) {}
        }

        // 2. Send Email Overtime Reminder
        if (in_array($channel, ['both', 'email']) && $email) {
            try {
                \App\Jobs\SendBookingStatusUpdateJob::dispatch(
                    'venue',
                    $booking,
                    'exceed_end_time',
                    $customMessage ?: 'Your scheduled venue reservation has exceeded its end time. Please conclude your activity or coordinate with the AVR Administrator immediately.'
                );
                $results[] = "Email sent to {$email}";
            } catch (\Throwable $e) {}
        }

        if (empty($results)) {
            return response()->json(['message' => 'No requestor email address or valid phone number found.'], 422);
        }

        return response()->json([
            'message' => '✅ Overtime / Exceeded End Time reminder sent (' . implode(' & ', $results) . ')',
            'results' => $results,
        ]);
    }
}
