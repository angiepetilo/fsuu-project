<?php

namespace App\Http\Controllers;

use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Exceptions\BookingActionNotAllowedException;
use App\Http\Requests\Public\StorePublicAvrEquipmentBorrowingRequest;
use App\Services\AvrEquipmentBorrowingService;
use Illuminate\Http\JsonResponse;

class PublicAvrEquipmentBorrowingController extends Controller
{
    public function __construct(private AvrEquipmentBorrowingService $service) {}

    public function store(StorePublicAvrEquipmentBorrowingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['submitted_by'] = null;

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
