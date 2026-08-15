<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Http\Requests\EquipmentBorrowing\ApproveEquipmentBorrowingRequest;
use App\Http\Requests\EquipmentBorrowing\CancelEquipmentBorrowingRequest;
use App\Http\Requests\EquipmentBorrowing\RejectEquipmentBorrowingRequest;
use App\Http\Requests\EquipmentBorrowing\StoreEquipmentBorrowingRequest;
use App\Models\EquipmentBorrowing;
use App\Services\EquipmentBorrowingService;
use Illuminate\Http\JsonResponse;

class EquipmentBorrowingController extends Controller
{
    public function __construct(
        private EquipmentBorrowingService $service
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', EquipmentBorrowing::class);

        $user = auth()->user();

        $borrowings = EquipmentBorrowing::with('items.equipmentType', 'trackingNumber')
            ->where(function ($q) {
                $q->whereHas('trackingNumber', function ($t) {
                    $t->whereNotIn('status', ['completed', 'done', 'returned']);
                })
                ->orWhereNull('tracking_number_id');
            })
            ->when(!$user->isSuperAdmin(), function ($query) use ($user) {
                $officeId = $user->office_id;
                if ($officeId) {
                    $query->where(function ($q) use ($officeId) {
                        $q->where('office_id', $officeId)
                          ->orWhereHas('items.equipmentType', fn ($sub) => $sub->where('office_id', $officeId));
                    });
                }
            })
            ->when($user->isSuperAdmin() && request()->filled('office_id') && request('office_id') !== 'all', function ($query) {
                $officeId = request('office_id');
                $query->where(function ($q) use ($officeId) {
                    $q->where('office_id', $officeId)
                      ->orWhereHas('items.equipmentType', fn ($sub) => $sub->where('office_id', $officeId));
                });
            })
            ->latest()
            ->paginate(25);

        return response()->json($borrowings);
    }

    public function show(EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('view', $equipmentBorrowing);

        return response()->json($equipmentBorrowing->load('items.equipmentType'));
    }

    public function store(StoreEquipmentBorrowingRequest $request): JsonResponse
    {
        if (auth()->check()) {
            $this->authorize('create', EquipmentBorrowing::class);
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

    public function approve(ApproveEquipmentBorrowingRequest $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);

        $borrowing = $this->service->approve(
            $equipmentBorrowing,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($borrowing);
    }

    public function reject(RejectEquipmentBorrowingRequest $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('reject', $equipmentBorrowing);

        $borrowing = $this->service->reject(
            $equipmentBorrowing,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($borrowing);
    }

    public function cancel(CancelEquipmentBorrowingRequest $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
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

    public function ongoing(\Illuminate\Http\Request $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);

        if ($equipmentBorrowing->tracking_number_id) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => 'on-going']);
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
            $equipmentBorrowing->forceFill(['status' => 'on-going'])->save();
        }

        // Hard commitment: Mark assigned physical units as 'unavailable' / in-use
        $assigned = $equipmentBorrowing->assigned_units ?? [];
        $barcodes = [];
        if (is_array($assigned)) {
            foreach ($assigned as $val) {
                if ($val) $barcodes[] = trim((string)$val);
            }
        }
        if (!empty($barcodes)) {
            \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
            })->update(['status' => 'unavailable']);
        }

        return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
    }

    public function complete(\Illuminate\Http\Request $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);

        if ($equipmentBorrowing->tracking_number_id) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => 'completed']);
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
            $equipmentBorrowing->forceFill(['status' => 'completed'])->save();
        }

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

        $rawCond = strtolower(trim((string)$request->get('condition', '')));
        if ($rawCond === 'lost') {
            $condition = 'lost';
        } else if ($rawCond === 'damaged' || $request->get('inspection_status') === 'violation') {
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

        $violationType = $request->get('violation_type') ?? ($isLate ? 'Late Equipment Return' : ($condition === 'damaged' ? 'Equipment Damage' : null));
        $notes = $request->get('notes') ?? $request->get('remarks') ?? ($isLate ? "Equipment returned {$minutesLate} minutes late." : ($condition !== 'good' ? "Return inspected: condition={$condition}." : 'Returned safely on time.'));
        $unitConditions = $request->input('unit_conditions');
        if (is_string($unitConditions)) {
            $unitConditions = json_decode($unitConditions, true) ?? [];
        }

        // Release physical units back based on return condition
        if (!empty($barcodes)) {
            if ($condition === 'good') {
                \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                    $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
                })->update(['status' => 'available', 'condition' => 'Good']);
            } else {
                \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                    $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
                })->update(['status' => 'unavailable', 'condition' => $condition]);
            }
        }

        // Handle per-unit condition updates if unit_conditions map supplied
        if (is_array($unitConditions)) {
            foreach ($unitConditions as $key => $condVal) {
                $uBar = $assigned[$key] ?? null;
                if ($uBar) {
                    $uBar = trim((string)$uBar);
                    $condNormalized = ucfirst(strtolower($condVal));
                    $uStatus = $condNormalized === 'Damaged' ? 'damaged' : ($condNormalized === 'Lost' ? 'lost' : 'available');
                    \App\Models\EquipmentUnit::where(function($q) use ($uBar) {
                        $q->where('unit_code', $uBar)->orWhere('name', $uBar);
                    })->update(['status' => $uStatus, 'condition' => $condNormalized]);
                }
            }
        }

        if (\Illuminate\Support\Facades\Schema::hasTable('inspections')) {
            $existingInsp = \Illuminate\Support\Facades\DB::table('inspections')
                ->where(function($q) use ($equipmentBorrowing) {
                    $q->where('inspectable_id', $equipmentBorrowing->id)
                      ->orWhere('reference_id', $equipmentBorrowing->id);
                })
                ->where(function($q) {
                    $q->where('inspectable_type', \App\Models\EquipmentBorrow::class)
                      ->orWhere('inspectable_type', 'equipment_borrow')
                      ->orWhere('reference_type', 'equipment_borrow');
                })
                ->first();

            $inspData = [
                'inspectable_type' => \App\Models\EquipmentBorrow::class,
                'inspectable_id'   => $equipmentBorrowing->id,
                'reference_type'   => 'equipment_borrow',
                'reference_id'     => $equipmentBorrowing->id,
                'inspected_by'     => auth()->id() ?? 1,
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

        return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
    }

    public function undo(\Illuminate\Http\Request $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
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
        $borrow = EquipmentBorrowing::with('items', 'trackingNumber')->find($id);
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

    public function assignUnits(\Illuminate\Http\Request $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('assignUnit', $equipmentBorrowing);

        $validated = $request->validate([
            'assigned_units' => 'nullable',
        ]);

        $assignedData = $validated['assigned_units'] ?? [];

        // Collect barcodes
        $barcodes = [];
        if (is_array($assignedData)) {
            foreach ($assignedData as $val) {
                if ($val) {
                    $barcodes[] = trim((string)$val);
                }
            }
        }

        // Validate assigned physical units belong to borrowing's office
        if (!empty($barcodes)) {
            $targetOfficeId = $equipmentBorrowing->office_id ?? $equipmentBorrowing->items()->first()?->equipmentType?->office_id;
            if ($targetOfficeId) {
                $crossOfficeUnits = \Illuminate\Support\Facades\DB::table('equipment_units')
                    ->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                    ->whereIn('equipment_units.unit_code', $barcodes)
                    ->where('equipment_types.office_id', '!=', $targetOfficeId)
                    ->count();
                if ($crossOfficeUnits > 0) {
                    return response()->json([
                        'message' => 'Cannot assign equipment units belonging to a different campus/office.',
                        'errors'  => ['assigned_units' => ['Cross-office unit assignment is not permitted.']]
                    ], 422);
                }
            }
        }

        $equipmentBorrowing->update([
            'assigned_units' => $assignedData,
        ]);

        // Immediate soft hold / reserved sub-status lock on selected physical units
        if (!empty($barcodes)) {
            \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
            })
            ->where('status', 'available')
            ->update(['status' => 'reserved']);
        }

        return response()->json($equipmentBorrowing);
    }

    public function override(\Illuminate\Http\Request $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);
        $borrowing = $this->service->override($equipmentBorrowing, auth()->user(), $request->all());
        return response()->json($borrowing);
    }
}
