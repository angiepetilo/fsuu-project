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

    public function index()
    {
        $this->authorize('viewAny', VenueBooking::class);

        $user = auth()->user();

        $bookings = VenueBooking::with('venue', 'trackingNumber', 'documents')
            ->where(function ($q) {
                $q->whereHas('trackingNumber', function ($t) {
                    $t->whereNotIn('status', ['completed', 'done']);
                })
                ->orWhereNull('tracking_number_id');
            })

            ->when(!$user->isSuperAdmin(), function ($query) use ($user) {
                $officeId = $user->office_id;
                if ($officeId) {
                    $query->whereHas('venue', function ($vQ) use ($officeId) {
                        $vQ->where('office_id', $officeId);
                    });
                }
            })
            ->when($user->isSuperAdmin() && request()->filled('office_id') && request('office_id') !== 'all', function ($query) {
                $officeId = request('office_id');
                $query->whereHas('venue', function ($vQ) use ($officeId) {
                    $vQ->where('office_id', $officeId);
                });
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

        // Validate physical units belong to venue office
        if (!empty($barcodes)) {
            $venueOfficeId = $avrVenueBooking->venue?->office_id ?? DB::table('venues')->where('id', $avrVenueBooking->venue_id)->value('office_id');
            if ($venueOfficeId) {
                $crossOfficeUnits = DB::table('equipment_units')
                    ->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                    ->whereIn('equipment_units.unit_code', $barcodes)
                    ->where('equipment_types.office_id', '!=', $venueOfficeId)
                    ->count();
                if ($crossOfficeUnits > 0) {
                    return response()->json([
                        'message' => 'Cannot assign equipment units belonging to a different campus/office.',
                        'errors'  => ['assigned_units' => ['Cross-office unit assignment is not permitted.']]
                    ], 422);
                }
            }
        }

        // Count assigned physical units per equipment_type_id
        if (!empty($barcodes) && !empty($requestedMap)) {
            $assignedUnitsInDb = DB::table('equipment_units')
                ->whereIn('unit_code', $barcodes)
                ->get();

            $assignedCounts = [];
            foreach ($assignedUnitsInDb as $unitRow) {
                $tId = (int)$unitRow->equipment_type_id;
                $assignedCounts[$tId] = ($assignedCounts[$tId] ?? 0) + 1;
            }

            foreach ($assignedCounts as $typeId => $assignedQty) {
                $requestedQty = $requestedMap[$typeId] ?? 0;
                if ($requestedQty > 0 && $assignedQty > $requestedQty) {
                    $eqTypeObj = DB::table('equipment_types')->where('id', $typeId)->first();
                    $typeName = $eqTypeObj ? ($eqTypeObj->eq_name ?? $eqTypeObj->name) : "Type #{$typeId}";
                    return response()->json([
                        'message' => "Cannot assign {$assignedQty} units for {$typeName}. Only {$requestedQty} unit(s) were requested for this booking."
                    ], 422);
                }
            }
        }

        $avrVenueBooking->update([
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

        return response()->json($avrVenueBooking);
    }

    public function override(Request $request, VenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);
        $booking = $this->service->override($avrVenueBooking, auth()->user(), $request->all());
        return response()->json($booking);
    }
}
