<?php

namespace App\Http\Controllers;

use App\Exceptions\StudioReservationTooSoonException;
use App\Exceptions\VenueOverlapException;
use App\Http\Requests\Public\StorePublicScoStudioReservationRequest;
use App\Services\ScoStudioReservationService;
use Illuminate\Http\JsonResponse;

class PublicScoStudioReservationController extends Controller
{
    public function __construct(private ScoStudioReservationService $service) {}

    public function store(StorePublicScoStudioReservationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['submitted_by'] = null;

        try {
            $reservation = $this->service->create($data);
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (StudioReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($reservation, 201);
    }
}
