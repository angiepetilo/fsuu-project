<?php

namespace App\Http\Controllers;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\EquipmentUnavailableException;
use App\Http\Requests\Staff\StoreEquipmentAssignmentRequest;
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentBorrowingItem;
use App\Services\AvrEquipmentBorrowingService;
use Illuminate\Http\JsonResponse;

class AvrEquipmentBorrowingAssignmentController extends Controller
{
    public function __construct(private AvrEquipmentBorrowingService $service) {}

    public function store(StoreEquipmentAssignmentRequest $request, EquipmentBorrowing $borrowing, EquipmentBorrowingItem $item): JsonResponse
    {
        // Gate: only Staff with equipment_borrowing + assign_checkout permission
        // for THIS borrowing's office may assign units.
        $this->authorize('assignUnit', $borrowing);

        // Sanity check: item must belong to the borrowing in the URL
        if ($item->equipment_borrowing_id !== $borrowing->id) {
            return response()->json(['message' => 'Item does not belong to this borrowing.'], 400);
        }

        try {
            $assignment = $this->service->assignUnit($item, $request->input('barcode'), $request->user());
        } catch (BookingActionNotAllowedException | EquipmentUnavailableException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($assignment, 201);
    }
}
