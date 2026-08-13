<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Exceptions\VenueOverlapException;
use App\Http\Requests\Public\StorePublicVenueBookingRequest;
use App\Services\VenueBookingService;
use Illuminate\Http\JsonResponse;

class VenueBookingController extends Controller
{
    public function __construct(private VenueBookingService $service) {}

    public function store(StorePublicVenueBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['submitted_by'] = null;

        if ($request->hasFile('endorsement_file')) {
            $path = $request->file('endorsement_file')->store('endorsements', 'public');
            $data['endorsement_url'] = '/storage/' . $path;
        }

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
