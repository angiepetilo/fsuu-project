<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\StudioReservationTooSoonException;
use App\Exceptions\VenueOverlapException;
use App\Http\Requests\ScoStudioReservation\ApproveScoStudioReservationRequest;
use App\Http\Requests\ScoStudioReservation\CancelScoStudioReservationRequest;
use App\Http\Requests\ScoStudioReservation\RejectScoStudioReservationRequest;
use App\Http\Requests\ScoStudioReservation\StoreScoStudioReservationRequest;
use App\Models\ScoStudioReservation;
use App\Services\ScoStudioReservationService;
use Illuminate\Http\JsonResponse;

class ScoStudioReservationController extends Controller
{
    public function __construct(
        private ScoStudioReservationService $service
    ) {}

    public function index()
    {
        $this->authorize('viewAny', ScoStudioReservation::class);

        $user = auth()->user();

        $reservations = ScoStudioReservation::with(['venue', 'documents'])
            ->when(! $user->isSuperAdmin(), function ($query) use ($user) {
                $query->whereHas('venue', fn ($q) => $q->where('office_id', $user->office_id));
            })
            ->latest()
            ->paginate(20);

        return response()->json($reservations);
    }

    public function show(ScoStudioReservation $scoStudioReservation): JsonResponse
    {
        $this->authorize('view', $scoStudioReservation);

        return response()->json($scoStudioReservation->load('venue', 'approvals', 'documents'));
    }

    public function store(StoreScoStudioReservationRequest $request): JsonResponse
    {
        $this->authorize('create', ScoStudioReservation::class);

        $data = $request->validated();
        $data['submitted_by'] = auth()->id();

        try {
            $reservation = $this->service->create($data);
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (StudioReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($reservation, 201);
    }

    public function approve(ApproveScoStudioReservationRequest $request, ScoStudioReservation $scoStudioReservation): JsonResponse
    {
        $this->authorize('approve', $scoStudioReservation);

        $reservation = $this->service->approve(
            $scoStudioReservation,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($reservation);
    }

    public function reject(RejectScoStudioReservationRequest $request, ScoStudioReservation $scoStudioReservation): JsonResponse
    {
        $this->authorize('reject', $scoStudioReservation);

        $reservation = $this->service->reject(
            $scoStudioReservation,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($reservation);
    }

    public function cancel(CancelScoStudioReservationRequest $request, ScoStudioReservation $scoStudioReservation): JsonResponse
    {
        $this->authorize('cancel', $scoStudioReservation);

        try {
            $reservation = $this->service->cancel(
                $scoStudioReservation,
                auth()->user(),
                $request->validated('remarks')
            );
        } catch (BookingActionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($reservation);
    }
}
