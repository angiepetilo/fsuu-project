<?php

namespace App\Http\Controllers;

use App\Exceptions\VenueOverlapException;
use App\Http\Requests\Public\StorePublicAvrVenueBookingRequest;
use App\Services\AvrVenueBookingService;
use Illuminate\Http\JsonResponse;

class PublicAvrVenueBookingController extends Controller
{
    public function __construct(private AvrVenueBookingService $service) {}

    public function store(StorePublicAvrVenueBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        // Force submitted_by to null for public requests
        $data['submitted_by'] = null;

        try {
            $booking = $this->service->create($data);
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\App\Exceptions\VenueReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($booking, 201);
    }
}
