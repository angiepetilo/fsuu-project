<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\TrackBookingRequest;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    public function track(TrackBookingRequest $request): JsonResponse
    {
        $referenceCode = trim($request->input('reference_code') ?? '');
        $email = trim($request->input('requestor_email') ?? '');

        $booking = null;

        $refLower = strtolower($referenceCode);

        // 1. Search in tracking_numbers table (case-insensitive)
        $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->whereRaw('LOWER(reference_code) = ?', [$refLower])
            ->orWhere('id', str_replace(['trk-avr', 'trk-', 'eq-2026-', 'eq-'], '', $refLower))
            ->first();

        if ($tracking) {
            if (in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing'])) {
                $booking = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber', 'department'])
                    ->find($tracking->reservation_id);
            } elseif ($tracking->reservation_type === 'venue_booking') {
                $booking = VenueBooking::with(['venue', 'trackingNumber', 'department'])->where('id', $tracking->reservation_id)->first();
            }
        }

        // 2. Direct fallback on EquipmentBorrow
        if (!$booking) {
            $booking = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber', 'department'])
                ->whereHas('trackingNumber', fn($q) => $q->whereRaw('LOWER(reference_code) = ?', [$refLower]))
                ->orWhere('id', str_replace(['eq-2026-', 'eq-'], '', $refLower))
                ->first();
        }

        // 3. Direct fallback on VenueBooking
        if (!$booking) {
            $booking = VenueBooking::with(['venue', 'trackingNumber', 'department'])
                ->whereRaw('LOWER(reference_code) = ?', [$refLower])
                ->orWhere('id', str_replace(['trk-avr', 'trk-'], '', $refLower))
                ->first();
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

    public function cancel(\Illuminate\Http\Request $request): JsonResponse
    {
        $referenceCode = trim($request->input('reference_code') ?? '');
        $reason = trim($request->input('reason') ?? 'Cancelled by applicant');

        if (empty($referenceCode)) {
            return response()->json(['message' => 'Reference code is required.'], 422);
        }

        $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->where('reference_code', $referenceCode)
            ->first();

        if ($tracking && $tracking->reservation_type === 'venue_booking') {
            $vb = VenueBooking::find($tracking->reservation_id);
            if ($vb) {
                if (in_array(strtolower($vb->status), ['completed', 'cancelled', 'rejected', 'damaged'])) {
                    return response()->json(['message' => 'This reservation can no longer be cancelled.'], 400);
                }
                $vb->update(['status' => 'cancelled', 'rejection_reason' => $reason]);
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $tracking->id)->update(['status' => 'cancelled']);
                return response()->json(['message' => 'Venue reservation successfully cancelled.', 'status' => 'cancelled']);
            }
        }

        if ($tracking && in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing'])) {
            $eb = EquipmentBorrow::find($tracking->reservation_id);
            if ($eb) {
                if (in_array(strtolower($eb->status), ['completed', 'cancelled', 'returned', 'rejected', 'damaged'])) {
                    return response()->json(['message' => 'This borrowing can no longer be cancelled.'], 400);
                }
                $eb->update(['status' => 'cancelled', 'notes' => $reason]);
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $tracking->id)->update(['status' => 'cancelled']);
                return response()->json(['message' => 'Equipment borrowing successfully cancelled.', 'status' => 'cancelled']);
            }
        }

        // Direct fallback on VenueBooking
        $vb = VenueBooking::where('reference_code', $referenceCode)->first();
        if ($vb) {
            if (in_array(strtolower($vb->status), ['completed', 'cancelled', 'rejected', 'damaged'])) {
                return response()->json(['message' => 'This reservation can no longer be cancelled.'], 400);
            }
            $vb->update(['status' => 'cancelled', 'rejection_reason' => $reason]);
            return response()->json(['message' => 'Venue reservation successfully cancelled.', 'status' => 'cancelled']);
        }

        return response()->json(['message' => 'Reservation could not be found or cancelled.'], 404);
    }
}
