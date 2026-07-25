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
        $status = request('status');

        $bookings = AvrVenueBooking::with(['venue', 'documents'])
            ->when(! $user->isSuperAdmin(), function ($query) use ($user) {
                $query->whereHas('venue', fn ($q) => $q->where('office_id', $user->office_id));
            })
            ->when($status, function ($query) use ($status) {
                if ($status === 'ongoing') {
                    $query->whereIn('status', ['ready', 'in_use']);
                } else {
                    $query->where('status', $status);
                }
            })
            ->latest()
            ->paginate(20);

        return response()->json($bookings);
    }

    public function show(AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $this->authorize('view', $avrVenueBooking);

        return response()->json($avrVenueBooking->load('venue', 'approvals', 'documents'));
    }

    public function store(StoreAvrVenueBookingRequest $request): JsonResponse
    {
        $this->authorize('create', AvrVenueBooking::class);

        $data = $request->validated();
        $data['submitted_by'] = auth()->id();

        try {
            $booking = $this->service->create($data);
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\App\Exceptions\VenueReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($booking, 201);
    }

    public function update(\Illuminate\Http\Request $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        // Add auth check here if needed, or RBAC check
        $data = $request->except(['id', 'reference_code', 'status', 'created_at', 'updated_at', 'venue']);
        $avrVenueBooking->update($data);
        return response()->json($avrVenueBooking);
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

    public function notifyMissing(\Illuminate\Http\Request $request, AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        // Trigger SMTP email
        \Illuminate\Support\Facades\Mail::to($avrVenueBooking->requestor_email)
            ->send(new \App\Mail\MissingRequirementsMail([
                'requestor' => $avrVenueBooking->requestor_name,
                'tracking_number' => $avrVenueBooking->reference_code,
            ], 'venue'));

        return response()->json(['message' => 'Notification sent']);
    }

    public function setReady(AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $avrVenueBooking->forceFill(['status' => 'ready'])->save();
        return response()->json($avrVenueBooking);
    }

    public function setOngoing(AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $avrVenueBooking->forceFill(['status' => 'in_use'])->save();
        return response()->json($avrVenueBooking);
    }

    public function complete(AvrVenueBooking $avrVenueBooking): JsonResponse
    {
        $avrVenueBooking->forceFill(['status' => 'completed'])->save();
        return response()->json($avrVenueBooking);
    }
}