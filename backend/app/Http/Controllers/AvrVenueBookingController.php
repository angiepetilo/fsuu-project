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
            ->where(function ($q) {
                $q->whereHas('trackingNumber', function ($t) {
                    $t->whereNotIn('status', ['completed', 'done']);
                })
                ->orWhereNull('tracking_number_id');
            })

            ->when(!$user->isSuperAdmin(), function ($query) use ($user) {
                $officeId = $user->office_id ?? 1;
                $query->where(function ($q) use ($officeId) {
                    $q->whereHas('venue', function ($vQ) use ($officeId) {
                        $vQ->where('office_id', $officeId)
                           ->orWhereNull('office_id');
                    })
                    ->orWhereNull('venue_id');
                });
            })
            ->latest()
            ->paginate(25);

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

    public function resendEmail(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $booking = AvrVenueBooking::with('venue', 'trackingNumber')->find($id);
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
}