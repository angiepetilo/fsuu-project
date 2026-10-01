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

    /**
     * POST /public/avr-venue-bookings/check-duplicate
     * Read-only pre-submit check so the frontend can warn the user about an existing
     * active/pending reservation under their identity BEFORE they submit the form.
     */
    public function checkDuplicate(\Illuminate\Http\Request $request): JsonResponse
    {
        $duplicate = $this->service->checkDuplicate($request->all());

        return response()->json([
            'duplicate' => (bool) $duplicate,
            'details'   => $duplicate,
        ]);
    }

    public function store(StorePublicVenueBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['submitted_by'] = null;

        if ($request->hasFile('endorsement_file')) {
            $data['endorsement_url'] = app(\App\Services\MediaUploadService::class)->upload($request->file('endorsement_file'), 'endorsements');
        } elseif ($request->filled('endorsement_file')) {
            $data['endorsement_url'] = app(\App\Services\MediaUploadService::class)->upload($request->input('endorsement_file'), 'endorsements');
        }

        try {
            $booking = $this->service->create($data);
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\App\Exceptions\VenueReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Public Venue Booking Store Error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($booking, 201);
    }
}
