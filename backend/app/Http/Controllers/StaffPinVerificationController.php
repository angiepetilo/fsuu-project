<?php

namespace App\Http\Controllers;

use App\Http\Requests\Staff\StoreStaffPinVerificationRequest;
use App\Models\AvrVenueBooking;
use App\Services\EntryVerificationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;

class StaffPinVerificationController extends Controller
{
    public function __construct(private EntryVerificationService $service) {}

    public function store(StoreStaffPinVerificationRequest $request, AvrVenueBooking $booking): JsonResponse
    {
        try {
            $verification = $this->service->record(
                $booking,
                $request->user(),
                $request->input('contact_method_verified'),
                $request->input('raw_pin')
            );
        } catch (AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($verification, 201);
    }
}
