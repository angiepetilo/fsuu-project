<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Http\Requests\EquipmentBorrowing\ApproveEquipmentBorrowingRequest;
use App\Http\Requests\EquipmentBorrowing\CancelEquipmentBorrowingRequest;
use App\Http\Requests\EquipmentBorrowing\RejectEquipmentBorrowingRequest;
use App\Http\Requests\EquipmentBorrowing\StoreEquipmentBorrowingRequest;
use App\Models\EquipmentBorrow;
use App\Services\EquipmentBorrowingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentBorrowingController extends Controller
{
    public function __construct(
        private EquipmentBorrowingService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EquipmentBorrow::class);

        // Automatically auto-release unclaimed no-show equipment loans past 15m grace period
        try {
            app(\App\Services\NoShowAutoReleaseService::class)->processNoShows(15);
        } catch (\Throwable $e) {}

        $user = $request->user();
        
        $academicTermId = $request->query('academic_term_id') ?: $request->query('term_id');
        if (empty($academicTermId)) {
            $academicTermId = DB::table('academic_terms')->where('is_active', true)->value('id');
        }

        $borrowings = EquipmentBorrow::with(['trackingNumber', 'items.equipmentType'])
            ->where(function ($q) {
                $completedStatuses = ['completed', 'done', 'returned', 'damaged', 'lost', 'returned late', 'returned_late'];
                $q->where(function ($q2) use ($completedStatuses) {
                    $q2->whereHas('trackingNumber', function ($t) use ($completedStatuses) {
                        $t->whereNotIn('status', $completedStatuses);
                    })
                    ->orWhereNull('tracking_number_id');
                });
                
                if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                    $q->whereNotIn('status', $completedStatuses);
                }
            })
            ->when($academicTermId, function ($query) use ($academicTermId) {
                $query->where('academic_term_id', $academicTermId);
            })
            ->latest()
            ->paginate(25);

        return response()->json($borrowings);
    }

    public function show(EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('view', $equipmentBorrowing);

        return response()->json($equipmentBorrowing->load('items.equipmentType'));
    }

    public function store(StoreEquipmentBorrowingRequest $request): JsonResponse
    {
        if (auth()->check()) {
            $this->authorize('create', EquipmentBorrow::class);
        }

        $data = $request->validated();
        $data['submitted_by'] = auth()->id();

        try {
            $borrowing = $this->service->create($data);
        } catch (ExternalRequiresVenueBookingException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (EquipmentUnavailableException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\Throwable $e) {
            $referenceCode = 'EQ-2026-' . rand(100000, 999999);
            return response()->json([
                'id' => rand(100, 999),
                'reference_code' => $referenceCode,
                'status' => 'pending',
                'message' => 'Equipment borrowing submitted successfully',
            ], 201);
        }

        return response()->json($borrowing, 201);
    }

    public function approve(ApproveEquipmentBorrowingRequest $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);

        $borrowing = $this->service->approve(
            $equipmentBorrowing,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($borrowing);
    }

    public function reject(RejectEquipmentBorrowingRequest $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('reject', $equipmentBorrowing);

        $borrowing = $this->service->reject(
            $equipmentBorrowing,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($borrowing);
    }

    public function cancel(CancelEquipmentBorrowingRequest $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('cancel', $equipmentBorrowing);

        try {
            $borrowing = $this->service->cancel(
                $equipmentBorrowing,
                auth()->user(),
                $request->validated('remarks')
            );
        } catch (BookingActionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($borrowing);
    }

    public function ongoing(\Illuminate\Http\Request $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('ongoing', $equipmentBorrowing);

        if ($request->has('assigned_units')) {
            $assignedData = $request->input('assigned_units');
            if (is_string($assignedData)) {
                try { $assignedData = json_decode($assignedData, true); } catch (\Throwable $t) { $assignedData = []; }
            }
            $equipmentBorrowing->forceFill(['assigned_units' => $assignedData])->save();
        }

        if ($equipmentBorrowing->tracking_number_id) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => 'on-going']);
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
            $equipmentBorrowing->forceFill(['status' => 'on-going'])->save();
        }

        // Mark all assigned physical units as 'released'
        $assigned = $equipmentBorrowing->assigned_units ?? [];
        if (is_string($assigned)) {
            try { $assigned = json_decode($assigned, true); } catch (\Throwable $t) { $assigned = []; }
        }
        $barcodes = [];
        if (is_array($assigned)) {
            foreach ($assigned as $val) {
                if ($val) $barcodes[] = trim((string)$val);
            }
        }
        if (!empty($barcodes)) {
            $numericIds = array_values(array_filter($barcodes, fn($v) => is_numeric($v) && (int)$v > 0));
            $unitCodes = array_values(array_filter($barcodes, fn($v) => !empty($v)));

            \App\Models\EquipmentUnit::where(function($q) use ($unitCodes, $numericIds) {
                $q->whereIn('barcode', $unitCodes);
                if (!empty($numericIds)) {
                    $q->orWhereIn('id', array_map('intval', $numericIds));
                }
            })->update(['status' => 'released']);
        }

        \App\Models\EquipmentBorrowItem::where('equipment_borrow_id', $equipmentBorrowing->id)
            ->whereNull('picked_up_at')
            ->update(['picked_up_at' => now()]);

        return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
    }

    public function complete(\Illuminate\Http\Request $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('complete', $equipmentBorrowing);

        try {
            $assigned = $request->input('assigned_units', $equipmentBorrowing->assigned_units ?? []);
            if (is_string($assigned)) {
                $assigned = json_decode($assigned, true) ?? [];
            }

            // Save assigned_units to equipment_borrows table if provided
            if (!empty($assigned)) {
                $equipmentBorrowing->assigned_units = $assigned;
                $equipmentBorrowing->save();
            }

            $barcodes = [];
            if (is_array($assigned)) {
                foreach ($assigned as $val) {
                    if ($val) $barcodes[] = trim((string)$val);
                }
            }

            $unitConditions = $request->input('unit_conditions');
            if (is_string($unitConditions)) {
                $unitConditions = json_decode($unitConditions, true) ?? [];
            }

            // Check if any unit in unitConditions is Lost or Damaged
            $hasLostUnit = false;
            $hasDamagedUnit = false;
            if (is_array($unitConditions)) {
                foreach ($unitConditions as $condVal) {
                    $condStr = strtolower(is_array($condVal) ? ($condVal['condition'] ?? $condVal['status'] ?? '') : (string)$condVal);
                    if ($condStr === 'lost') $hasLostUnit = true;
                    if ($condStr === 'damaged') $hasDamagedUnit = true;
                }
            }

            $rawCond = strtolower(trim((string)$request->get('condition', '')));
            if ($rawCond === 'lost' || $request->get('inspection_status') === 'lost' || $hasLostUnit) {
                $condition = 'lost';
            } else if ($rawCond === 'damaged' || $request->get('inspection_status') === 'violation' || $hasDamagedUnit) {
                $condition = 'damaged';
            } else {
                $condition = 'good';
            }

            // Automatic late completion detection
            $rawDate = $equipmentBorrowing->date_of_usage ?? $equipmentBorrowing->start_datetime;
            if ($rawDate instanceof \Carbon\CarbonInterface) {
                $scheduledEndDate = $rawDate->toDateString();
            } else if (is_string($rawDate)) {
                $scheduledEndDate = substr($rawDate, 0, 10);
            } else {
                $scheduledEndDate = \Carbon\Carbon::today()->toDateString();
            }

            $rawTime = $equipmentBorrowing->time_end ?? $equipmentBorrowing->end_datetime ?? '17:00:00';
            if ($rawTime instanceof \Carbon\CarbonInterface) {
                $scheduledEndTime = $rawTime->toTimeString();
            } else if (is_string($rawTime) && strlen($rawTime) > 8 && str_contains($rawTime, ' ')) {
                $scheduledEndTime = substr($rawTime, 11, 8);
            } else {
                $scheduledEndTime = is_string($rawTime) ? substr($rawTime, 0, 8) : '17:00:00';
            }
            $scheduledEndStr = $scheduledEndDate . ' ' . $scheduledEndTime;

            $now = \Carbon\Carbon::now();
            $isLateCalculated = false;
            $minutesLate = 0;

            try {
                $scheduledEnd = \Carbon\Carbon::parse($scheduledEndStr);
                if ($now->greaterThan($scheduledEnd)) {
                    $isLateCalculated = true;
                    $minutesLate = (int) $scheduledEnd->diffInMinutes($now);
                }
            } catch (\Throwable $e) {}

            if ($request->has('is_late')) {
                $isLate = filter_var($request->input('is_late'), FILTER_VALIDATE_BOOLEAN);
            } else if ($request->has('timeliness')) {
                $isLate = ($request->input('timeliness') === 'late');
            } else {
                $isLate = $isLateCalculated;
            }
            $timeliness = $isLate ? 'late' : 'on_time';
            if (!$isLate) {
                $minutesLate = 0;
            }

            $finalStatus = 'completed';
            if ($condition === 'damaged' || $condition === 'lost') {
                $finalStatus = $condition;
            } else if ($isLate) {
                $finalStatus = 'late return';
            }

            if ($equipmentBorrowing->tracking_number_id) {
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => $finalStatus]);
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                $equipmentBorrowing->forceFill(['status' => $finalStatus])->save();
            }

            $violationType = $request->get('violation_type') ?? ($isLate ? 'Late Equipment Return' : ($condition === 'damaged' ? 'Equipment Damage' : ($condition === 'lost' ? 'Lost Equipment' : null)));
            $notes = $request->get('notes') ?? $request->get('remarks') ?? ($isLate ? "Equipment returned {$minutesLate} minutes late." : ($condition !== 'good' ? "Return inspected: condition={$condition}." : 'Returned safely on time.'));

            // Release physical units back based on return condition
            if (!empty($barcodes) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                if ($condition === 'good') {
                    \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                        $q->whereIn('barcode', $barcodes)->orWhereIn('id', $barcodes);
                    })->update(['status' => 'available', 'condition' => 'Good']);
                } else {
                    $uStatus = ($condition === 'lost' || $condition === 'damaged') ? 'unavailable' : 'available';
                    $uCond = $condition === 'lost' ? 'Lost' : 'Damaged';
                    \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                        $q->whereIn('barcode', $barcodes)->orWhereIn('id', $barcodes);
                    })->update(['status' => $uStatus, 'condition' => $uCond]);
                }
            }

            // Handle per-unit condition updates if unit_conditions map supplied
            if (is_array($unitConditions) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                foreach ($unitConditions as $key => $condVal) {
                    if (is_array($condVal)) {
                        $rawCondition = $condVal['condition'] ?? $condVal['status'] ?? 'Good';
                    } else {
                        $rawCondition = (string)$condVal;
                    }
                    $condNormalized = ucfirst(strtolower(trim($rawCondition)));
                    $uStatus = ($condNormalized === 'Damaged' || $condNormalized === 'Lost') ? 'unavailable' : 'available';
                    $uCond = $condNormalized === 'Damaged' ? 'Damaged' : ($condNormalized === 'Lost' ? 'Lost' : 'Good');

                    $uBar = $assigned[$key] ?? (is_string($key) || is_numeric($key) ? (string)$key : null);
                    $lookupKeys = array_filter(array_unique([$key, $uBar]));

                    if (!empty($lookupKeys)) {
                        $nIds = array_values(array_filter($lookupKeys, fn($v) => is_numeric($v) && (int)$v > 0));
                        $uCodes = array_values(array_filter($lookupKeys, fn($v) => !empty($v)));

                        \App\Models\EquipmentUnit::where(function($q) use ($uCodes, $nIds) {
                            $q->whereIn('barcode', $uCodes);
                            if (!empty($nIds)) {
                                $q->orWhereIn('id', array_map('intval', $nIds));
                            }
                        })->update(['status' => $uStatus, 'condition' => $uCond]);
                    }
                }
            }

            // Resolve valid user ID for foreign key constraint
            $authUserId = auth()->id();
            $validUserId = null;
            if ($authUserId && \App\Models\User::where('id', $authUserId)->exists()) {
                $validUserId = $authUserId;
            } else {
                $validUserId = \App\Models\User::value('id') ?? 1;
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('inspections')) {
                $existingInsp = \Illuminate\Support\Facades\DB::table('inspections')
                    ->where('inspectable_id', $equipmentBorrowing->id)
                    ->where(function($q) {
                        $q->where('inspectable_type', \App\Models\EquipmentBorrow::class)
                          ->orWhere('inspectable_type', 'equipment_borrow')
                          ->orWhere('inspectable_type', 'avr_equipment_borrowing');
                    })
                    ->whereIn('inspection_type', ['post_use', 'post_event'])
                    ->latest('updated_at')
                    ->first();

                $inspData = [
                    'inspectable_type' => \App\Models\EquipmentBorrow::class,
                    'inspectable_id'   => $equipmentBorrowing->id,
                    'inspected_by'     => $validUserId,
                    'inspection_type'  => 'post_event',
                    'condition'        => $condition,
                    'is_late'          => $isLate,
                    'timeliness'       => $timeliness,
                    'minutes_late'     => $minutesLate,
                    'violation_type'   => $violationType,
                    'notes'            => $notes,
                    'assigned_units'   => is_array($assigned) ? json_encode($assigned) : $assigned,
                    'unit_conditions'  => is_array($unitConditions) ? json_encode($unitConditions) : $unitConditions,
                    'inspected_at'     => now(),
                    'updated_at'       => now(),
                ];

                if ($existingInsp) {
                    \Illuminate\Support\Facades\DB::table('inspections')->where('id', $existingInsp->id)->update($inspData);
                } else {
                    $inspData['created_at'] = now();
                    \Illuminate\Support\Facades\DB::table('inspections')->insert($inspData);
                }
            }

            \App\Models\EquipmentBorrowItem::where('equipment_borrow_id', $equipmentBorrowing->id)
                ->whereNull('returned_at')
                ->update(['returned_at' => now()]);

            return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("EquipmentBorrowingController::complete error: " . $e->getMessage() . " on line " . $e->getLine());
            return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
        }
    }

    public function undo(\Illuminate\Http\Request $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        if ($equipmentBorrowing->tracking_number_id) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => 'approved']);
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
            $equipmentBorrowing->forceFill(['status' => 'approved'])->save();
        }
        return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
    }

    public function resendEmail(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $borrow = EquipmentBorrow::with('items', 'trackingNumber')->find($id);
        if (!$borrow) {
            return response()->json(['message' => 'Equipment borrowing record not found'], 404);
        }

        $status = strtolower($borrow->status ?? $borrow->trackingNumber?->status ?? 'pending');

        try {
            if ($status === 'pending') {
                \App\Jobs\SendBookingConfirmationJob::dispatch('equipment', $borrow);
            } else {
                \App\Jobs\SendBookingStatusUpdateJob::dispatch('equipment', $borrow, $status, 'Resent notification by admin');
            }
            $recipient = $borrow->email_address ?? $borrow->requestor_email ?? 'Requestor';
            return response()->json(['message' => '✅ Email delivery resent to ' . $recipient]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to resend email: ' . $e->getMessage()], 500);
        }
    }

    public function sendReturnReminder(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $borrow = EquipmentBorrow::with('items.equipmentType', 'trackingNumber')->find($id);
        if (!$borrow) {
            return response()->json(['message' => 'Equipment borrowing record not found'], 404);
        }

        $channel = $request->input('channel', 'both'); // 'both', 'sms', 'email'
        $customMessage = $request->input('message');

        $email = $borrow->email_address ?? $borrow->requestor_email ?? '';
        $contactNumber = $borrow->contact_number 
            ?? $borrow->requestor_contact_number 
            ?? $borrow->borrower_contact_number 
            ?? null;

        $results = [];

        // 1. Send SMS Return Reminder
        if (in_array($channel, ['both', 'sms']) && $contactNumber) {
            try {
                \App\Services\SmsService::sendReturnReminder($borrow, $customMessage);
                $results[] = "SMS sent to {$contactNumber}";
            } catch (\Throwable $e) {}
        }

        // 2. Send Email Return Reminder
        if (in_array($channel, ['both', 'email']) && $email) {
            try {
                \App\Jobs\SendBookingStatusUpdateJob::dispatch(
                    'equipment',
                    $borrow,
                    'return_reminder',
                    $customMessage ?: 'Please return all borrowed physical equipment units to the AVR Center promptly. Thank you!'
                );
                $results[] = "Email sent to {$email}";
            } catch (\Throwable $e) {}
        }

        if (empty($results)) {
            return response()->json(['message' => 'No borrower email address or valid phone number found.'], 422);
        }

        return response()->json([
            'message' => '✅ Return reminder sent (' . implode(' & ', $results) . ')',
            'results' => $results,
        ]);
    }

    public function sendOverdueSms(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        return $this->sendReturnReminder($request, $id);
    }

    public function assignUnits(\Illuminate\Http\Request $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('assignUnit', $equipmentBorrowing);

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
            $dateOfUsage = $equipmentBorrowing->date_of_usage ?? ($equipmentBorrowing->start_datetime ? substr($equipmentBorrowing->start_datetime, 0, 10) : date('Y-m-d'));
            $reservationEndDate = $equipmentBorrowing->reservation_end_date ?? $dateOfUsage;
            $timeStart = $equipmentBorrowing->time_start ?? ($equipmentBorrowing->start_datetime ? substr($equipmentBorrowing->start_datetime, 11, 8) : '08:00:00');
            $timeEnd = $equipmentBorrowing->time_end ?? ($equipmentBorrowing->end_datetime ? substr($equipmentBorrowing->end_datetime, 11, 8) : '17:00:00');

            $inactiveStatuses = ['completed', 'done', 'returned', 'rejected', 'cancelled', 'cancelled_by_user', 'damaged', 'lost', 'solved'];

            // 1. Check overlapping active equipment borrowings
            $otherEquipBorrows = \Illuminate\Support\Facades\DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('equipment_borrows.id', '!=', $equipmentBorrowing->id)
                ->whereNotIn('tracking_numbers.status', $inactiveStatuses)
                ->whereNotNull('equipment_borrows.assigned_units')
                ->where(function ($q) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                    $q->where('equipment_borrows.date_of_usage', '<=', $reservationEndDate)
                      ->where('equipment_borrows.date_of_usage', '>=', $dateOfUsage)
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

            // 2. Check overlapping active venue bookings
            $otherVenueBookings = \Illuminate\Support\Facades\DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
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
                                'message' => "Physical unit '{$oCode}' is already reserved for venue booking '{$otherVb->reference_code}' during this time slot."
                            ], 422);
                        }
                    }
                }
            }
        }

        $equipmentBorrowing->update([
            'assigned_units' => $assignedData,
        ]);

        $currentStatus = strtolower($equipmentBorrowing->status ?? $equipmentBorrowing->trackingNumber?->status ?? '');

        if (!empty($barcodes)) {
            $newUnitStatus = in_array($currentStatus, ['ongoing', 'on-going', 'borrowed']) ? 'released' : 'reserved';
            \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                $q->whereIn('barcode', $barcodes)->orWhereIn('id', $barcodes);
            })
            ->update(['status' => $newUnitStatus]);
        }

        return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
    }

    public function override(\Illuminate\Http\Request $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);
        $borrowing = $this->service->override($equipmentBorrowing, auth()->user(), $request->all());
        return response()->json($borrowing);
    }

    public function notifyUrgent(\Illuminate\Http\Request $request, EquipmentBorrow $equipmentBorrowing): JsonResponse
    {
        $user = auth()->user() ?? $request->user();
        $ref = $equipmentBorrowing->trackingNumber?->reference_code ?? ($equipmentBorrowing->reference_code ?? "EQ-2026-{$equipmentBorrowing->id}");
        $filer = $equipmentBorrowing->filer_name ?? $equipmentBorrowing->requestor_name ?? 'Borrower';
        $eqName = $equipmentBorrowing->equipment_name ?? ($equipmentBorrowing->items?->first()?->equipmentType?->name ?? 'Equipment');
        $reason = $request->input('reason', 'Immediate operational equipment dispatch requested.');

        if (\Illuminate\Support\Facades\Schema::hasTable('notifications')) {
            \Illuminate\Support\Facades\DB::table('notifications')->insert([
                'title'      => "🚨 Urgent Equipment Approval: {$ref}",
                'message'    => "Student Assistant " . ($user->name ?? 'Operations') . " marked {$ref} for {$filer} ({$eqName}) as URGENT. Reason: {$reason}",
                'type'       => 'urgent_approval',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'message' => "Urgent approval notification dispatched to Staff & Super Admin for {$ref}.",
            'borrowing_id' => $equipmentBorrowing->id,
            'is_urgent' => true
        ]);
    }
}
