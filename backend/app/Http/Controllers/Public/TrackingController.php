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

        // Attach resolved built-in category names for equipment items
        if ($booking && $booking->relationLoaded('items') && $booking->items) {
            $allCategoryMap = \App\Models\EquipmentType::pluck('eq_name', 'id')->toArray();
            foreach ($booking->items as $item) {
                if ($item->equipmentType) {
                    $raw = $item->equipmentType->built_in_units;
                    if (is_string($raw)) {
                        $raw = json_decode($raw, true) ?: [];
                    }
                    $builtInNames = [];
                    if (is_array($raw)) {
                        foreach ($raw as $val) {
                            $name = $allCategoryMap[$val] ?? (string)$val;
                            if (!empty($name)) {
                                $builtInNames[] = $name;
                            }
                        }
                    }
                    $item->equipmentType->built_in_names = $builtInNames;
                }
            }
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

    public function resubmitRequirements(\Illuminate\Http\Request $request): JsonResponse
    {
        $referenceCode = trim($request->input('reference_code') ?? '');
        if (empty($referenceCode)) {
            return response()->json(['message' => 'Reference code is required.'], 422);
        }

        $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->where('reference_code', $referenceCode)
            ->first();

        $bookingId = $tracking ? $tracking->reservation_id : null;
        $vb = $bookingId ? VenueBooking::find($bookingId) : VenueBooking::where('reference_code', $referenceCode)->first();

        if (!$vb) {
            return response()->json(['message' => 'Venue reservation not found.'], 404);
        }

        $currentStatus = strtolower($vb->status ?? $vb->trackingNumber?->status ?? 'pending');
        if (!in_array($currentStatus, ['incomplete', 'pending'])) {
            return response()->json(['message' => "Cannot resubmit documents for a booking in status: {$currentStatus}."], 422);
        }

        $uploadedUrls = [];
        $mediaUploadService = app(\App\Services\MediaUploadService::class);

        // Handle single or multiple file uploads
        $filesToProcess = [];
        if ($request->hasFile('documents')) {
            $f = $request->file('documents');
            if (is_array($f)) {
                $filesToProcess = array_merge($filesToProcess, $f);
            } else {
                $filesToProcess[] = $f;
            }
        }
        if ($request->hasFile('requirement_file')) {
            $f = $request->file('requirement_file');
            if (is_array($f)) {
                $filesToProcess = array_merge($filesToProcess, $f);
            } else {
                $filesToProcess[] = $f;
            }
        }
        if ($request->hasFile('file')) {
            $f = $request->file('file');
            if (is_array($f)) {
                $filesToProcess = array_merge($filesToProcess, $f);
            } else {
                $filesToProcess[] = $f;
            }
        }

        foreach ($filesToProcess as $file) {
            $url = $mediaUploadService->upload($file, 'documents');
            $uploadedUrls[] = $url;
            \Illuminate\Support\Facades\DB::table('documents')->insert([
                'venue_booking_id' => $vb->id,
                'file_path'        => $url,
                'document_type'    => 'resubmitted_requirement',
                'status'           => 'pending',
                'uploaded_at'      => now(),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        if ($request->hasFile('endorsement_file')) {
            $url = $mediaUploadService->upload($request->file('endorsement_file'), 'endorsements');
            $uploadedUrls[] = $url;
            $vb->endorsement_url = $url;
            $vb->endorsement_letter = $url;
            \Illuminate\Support\Facades\DB::table('documents')->insert([
                'venue_booking_id' => $vb->id,
                'file_path'        => $url,
                'document_type'    => 'endorsement_letter',
                'status'           => 'pending',
                'uploaded_at'      => now(),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        if (empty($uploadedUrls)) {
            return response()->json(['message' => 'Please select at least one file to upload.'], 422);
        }

        // Transition back to pending / under review
        $vb->status = 'pending';
        $vb->is_complete = true;
        $vb->resubmitted_at = now();
        $vb->save();

        if ($tracking) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')
                ->where('id', $tracking->id)
                ->update(['status' => 'pending']);
        }

        // Broadcast real-time status update
        try {
            event(new \App\Events\BookingStatusUpdated('venue_booking', $referenceCode, 'pending', $vb->id, 'Missing requirements resubmitted by applicant'));
        } catch (\Throwable $e) {}

        // Notify Staff and Super Admin
        try {
            \App\Jobs\SendAdminPendingTaskNotificationJob::dispatch(
                'requirements_resubmitted',
                $vb,
                "Applicant {$vb->filer_name} has uploaded missing requirements for reservation {$referenceCode}."
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Missing requirements uploaded successfully! Your reservation has been returned to review.',
            'status'  => 'pending',
            'booking' => $vb->fresh(['venue', 'trackingNumber', 'department', 'documents']),
        ]);
    }
}
