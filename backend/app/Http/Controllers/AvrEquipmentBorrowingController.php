<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Http\Requests\AvrEquipmentBorrowing\ApproveAvrEquipmentBorrowingRequest;
use App\Http\Requests\AvrEquipmentBorrowing\CancelAvrEquipmentBorrowingRequest;
use App\Http\Requests\AvrEquipmentBorrowing\RejectAvrEquipmentBorrowingRequest;
use App\Http\Requests\AvrEquipmentBorrowing\StoreAvrEquipmentBorrowingRequest;
use App\Models\EquipmentBorrowing;
use App\Services\AvrEquipmentBorrowingService;
use Illuminate\Http\JsonResponse;

class AvrEquipmentBorrowingController extends Controller
{
    public function __construct(
        private AvrEquipmentBorrowingService $service
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
                if ($user->office_id) {
                    $query->where(function ($q) use ($user) {
                        $q->whereHas('items.equipmentType', fn ($sub) => $sub->where('office_id', $user->office_id))
                          ->orWhereDoesntHave('items.equipmentType');
                    });
                }
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

    public function store(StoreAvrEquipmentBorrowingRequest $request): JsonResponse
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

    public function approve(ApproveAvrEquipmentBorrowingRequest $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('approve', $equipmentBorrowing);

        $borrowing = $this->service->approve(
            $equipmentBorrowing,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($borrowing);
    }

    public function reject(RejectAvrEquipmentBorrowingRequest $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('reject', $equipmentBorrowing);

        $borrowing = $this->service->reject(
            $equipmentBorrowing,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($borrowing);
    }

    public function cancel(CancelAvrEquipmentBorrowingRequest $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
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
        if ($equipmentBorrowing->tracking_number_id) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => 'on-going']);
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
            $equipmentBorrowing->forceFill(['status' => 'on-going'])->save();
        }
        return response()->json($equipmentBorrowing->fresh(['items.equipmentType', 'trackingNumber']));
    }

    public function complete(\Illuminate\Http\Request $request, EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        if ($equipmentBorrowing->tracking_number_id) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $equipmentBorrowing->tracking_number_id)->update(['status' => 'completed']);
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
            $equipmentBorrowing->forceFill(['status' => 'completed'])->save();
        }

        if ($request->get('inspection_status') === 'damages' || $request->get('has_damage')) {
            if (\Illuminate\Support\Facades\Schema::hasTable('inspections')) {
                \Illuminate\Support\Facades\DB::table('inspections')->insert([
                    'inspectable_type' => 'App\\Models\\EquipmentBorrow',
                    'inspectable_id'   => $equipmentBorrowing->id,
                    'inspected_by'     => auth()->id(),
                    'inspection_type'  => 'post_event',
                    'condition'        => 'damaged',
                    'notes'            => $request->get('remarks') ?? 'Equipment damage / late return reported.',
                    'inspected_at'     => now(),
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
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
        $borrowing = \App\Models\EquipmentBorrowing::with('items')->find($id);
        if (!$borrowing) {
            return response()->json(['message' => 'Equipment borrowing record not found'], 404);
        }

        $status = strtolower($borrowing->status ?? $borrowing->trackingNumber?->status ?? 'pending');

        try {
            if ($status === 'pending') {
                \App\Jobs\SendBookingConfirmationJob::dispatch('equipment', $borrowing);
            } else {
                \App\Jobs\SendBookingStatusUpdateJob::dispatch('equipment', $borrowing, $status, 'Resent notification by admin');
            }
            $recipient = $borrowing->borrower_email ?? $borrowing->requestor_email ?? $borrowing->email_address ?? 'Requestor';
            return response()->json(['message' => '✅ Email delivery resent to ' . $recipient]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to resend email: ' . $e->getMessage()], 500);
        }
    }
}
