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

        $borrowings = EquipmentBorrowing::with('items.equipmentType')
            ->when(! $user->isSuperAdmin(), function ($query) use ($user) {
                $query->whereHas('items.equipmentType', fn ($q) => $q->where('office_id', $user->office_id));
            })
            ->latest()
            ->paginate(20);

        return response()->json($borrowings);
    }

    public function show(EquipmentBorrowing $equipmentBorrowing): JsonResponse
    {
        $this->authorize('view', $equipmentBorrowing);

        return response()->json($equipmentBorrowing->load('items.equipmentType'));
    }

    public function store(StoreAvrEquipmentBorrowingRequest $request): JsonResponse
    {
        $this->authorize('create', EquipmentBorrowing::class);

        $data = $request->validated();
        $data['submitted_by'] = auth()->id();

        try {
            $borrowing = $this->service->create($data);
        } catch (ExternalRequiresVenueBookingException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (EquipmentUnavailableException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (BookingActionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
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
}
