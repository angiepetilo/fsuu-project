<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\TrackBookingRequest;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrowing;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    public function track(TrackBookingRequest $request): JsonResponse
    {
        $referenceCode = trim($request->input('reference_code') ?? '');
        $email = trim($request->input('requestor_email') ?? '');

        $booking = null;

        if (str_starts_with($referenceCode, 'VN-') || str_starts_with($referenceCode, 'TRK-') || str_starts_with($referenceCode, 'REF-')) {
            $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
                ->where('reference_code', $referenceCode)
                ->orWhere('id', str_replace(['TRK-AVR', 'TRK-'], '', $referenceCode))
                ->first();

            if ($tracking && $tracking->reservation_type === 'venue_booking') {
                $booking = VenueBooking::with('venue', 'trackingNumber')->where('id', $tracking->reservation_id)->first();
            }
            if (!$booking) {
                $booking = VenueBooking::with('venue', 'trackingNumber')
                    ->where('reference_code', $referenceCode)
                    ->orWhere('id', str_replace(['TRK-AVR', 'TRK-'], '', $referenceCode))
                    ->first();
            }
        } elseif (str_starts_with($referenceCode, 'EQ-')) {
            // EQ references are stored in tracking_numbers — reservation_type is 'equipment_borrowing'
            $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
                ->where('reference_code', $referenceCode)
                ->first();
            if ($tracking && in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing'])) {
                $booking = EquipmentBorrowing::with('items.equipmentType', 'trackingNumber')
                    ->find($tracking->reservation_id);
            }
        }

        // Fallback: search across all models if not matched yet
        if (!$booking) {
            $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('reference_code', $referenceCode)->first();
            if ($tracking) {
                if (in_array($tracking->reservation_type, ['venue_booking'])) {
                    $booking = VenueBooking::with('venue', 'trackingNumber')->where('id', $tracking->reservation_id)->first();
                } elseif (in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing'])) {
                    $booking = EquipmentBorrowing::with('items.equipmentType', 'trackingNumber')->find($tracking->reservation_id);
                }
            }
        }

        $errorMessage = 'We could not find a booking matching this reference code.';

        if (! $booking) {
            return response()->json(['message' => $errorMessage], 404);
        }

        $requestorEmail = $booking->requestor_email ?? $booking->email_address ?? '';
        if (!empty($email) && strtolower($requestorEmail) !== strtolower($email)) {
            return response()->json(['message' => 'The provided email address does not match this reference code.'], 404);
        }

        // If matched, load approvals so user can see timeline
        if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
            $booking->load('approvals');
        }

        return response()->json($booking);
    }
}
