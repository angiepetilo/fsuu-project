<?php

namespace App\Http\Controllers;

use App\Http\Requests\Public\TrackBookingRequest;
use App\Models\AvrVenueBooking;
use App\Models\EquipmentBorrowing;
use App\Models\ScoStudioReservation;
use Illuminate\Http\JsonResponse;

class PublicTrackingController extends Controller
{
    public function track(TrackBookingRequest $request): JsonResponse
    {
        $referenceCode = $request->input('reference_code');
        $email = $request->input('requestor_email');

        $booking = null;

        if (str_starts_with($referenceCode, 'VN-')) {
            $booking = AvrVenueBooking::with('venue')->where('reference_code', $referenceCode)->first();
        } elseif (str_starts_with($referenceCode, 'EQ-')) {
            $booking = EquipmentBorrowing::with('items.equipmentType')->where('reference_code', $referenceCode)->first();
        } elseif (str_starts_with($referenceCode, 'ST-')) {
            $booking = ScoStudioReservation::with('venue')->where('reference_code', $referenceCode)->first();
        }

        // We use identical responses to prevent enumeration of valid reference codes
        $errorMessage = 'We could not find a booking matching this reference code and email address.';

        if (! $booking) {
            return response()->json(['message' => $errorMessage], 404);
        }

        if ($booking->requestor_email !== $email) {
            return response()->json(['message' => $errorMessage], 404);
        }

        // If matched, load approvals so user can see timeline
        $booking->load('approvals');

        return response()->json($booking);
    }
}
