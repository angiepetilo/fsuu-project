<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Exceptions\BookingActionNotAllowedException;
use App\Http\Requests\Public\StorePublicEquipmentBorrowingRequest;
use App\Services\EquipmentBorrowingService;
use Illuminate\Http\JsonResponse;

class EquipmentBorrowingController extends Controller
{
    public function __construct(private EquipmentBorrowingService $service) {}

    public function store(StorePublicEquipmentBorrowingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['submitted_by'] = null;

        if ($request->hasFile('endorsement_file')) {
            $data['endorsement_url'] = app(\App\Services\MediaUploadService::class)->upload($request->file('endorsement_file'), 'endorsements');
        }

        try {
            $borrowing = $this->service->create($data);
        } catch (EquipmentUnavailableException $e) {
            return response()->json([
                'message' => 'Sorry, the requested equipment is fully booked for that time slot. Please choose a different time.',
            ], 409);
        } catch (ExternalRequiresVenueBookingException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (BookingActionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($borrowing, 201);
    }
}
