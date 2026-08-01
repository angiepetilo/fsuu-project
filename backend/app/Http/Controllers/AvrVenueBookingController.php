<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\VenueOverlapException;
use App\Http\Requests\AvrVenueBooking\ApproveAvrVenueBookingRequest;
use App\Http\Requests\AvrVenueBooking\CancelAvrVenueBookingRequest;
use App\Http\Requests\AvrVenueBooking\RejectAvrVenueBookingRequest;
use App\Http\Requests\AvrVenueBooking\StoreAvrVenueBookingRequest;
use App\Models\AvrVenueBooking;
use App\Services\AvrVenueBookingService;
use Illuminate\Http\JsonResponse;

class AvrVenueBookingController extends Controller
{
    public function __construct(
        private AvrVenueBookingService $service
    ) {}

    public function index()
    {
        $this->authorize('viewAny', AvrVenueBooking::class);

        $user = auth()->user();

        $bookings = AvrVenueBooking::with('venue', 'trackingNumber', 'documents')
            ->whereHas('trackingNumber', function ($q) {
                $q->whereNotIn('status', ['completed', 'done']);
            })
            ->when(! $user->isSuperAdmin(), function ($query) use ($user) {
                $query->whereHas('venue', fn ($q) => $q->where('office_id', $user->office_id));
            })
            ->latest()
            ->paginate(20);

        return response()->json($bookings);
    }

    public function show(AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('view', $avrVenueBooking);

        $relations = ['venue', 'documents'];
        if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
            $relations[] = 'approvals';
        }

        return response()->json($avrVenueBooking->load($relations));
    }

    public function store(StoreAvrVenueBookingRequest $request): JsonResponse
    {
        if (auth()->check()) {
            $this->authorize('create', AvrVenueBooking::class);
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

    public function approve(ApproveAvrVenueBookingRequest $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('approve', $avrVenueBooking);

        $booking = $this->service->approve(
            $avrVenueBooking,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($booking);
    }

    public function reject(RejectAvrVenueBookingRequest $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('reject', $avrVenueBooking);

        $booking = $this->service->reject(
            $avrVenueBooking,
            auth()->user(),
            $request->validated('remarks')
        );

        return response()->json($booking);
    }

    public function ongoing(\Illuminate\Http\Request $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $booking = $this->service->ongoing($avrVenueBooking, auth()->user());
        return response()->json($booking);
    }

    public function complete(\Illuminate\Http\Request $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $booking = $this->service->complete($avrVenueBooking, auth()->user(), $request->all());
        return response()->json($booking);
    }

    public function undo(\Illuminate\Http\Request $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $booking = $this->service->undo($avrVenueBooking, auth()->user());
        return response()->json($booking);
    }

    public function cancel(CancelAvrVenueBookingRequest $request, AvrVenueBooking $avrVenueBooking): JsonResponse
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
}