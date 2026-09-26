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
            $allCategoryMap = \App\Models\EquipmentType::withTrashed()->pluck('eq_name', 'id')->toArray();
            foreach ($booking->items as $item) {
                $eqType = $item->equipmentType;
                $raw = $eqType ? ($eqType->built_in_units ?? []) : [];
                if (is_string($raw)) {
                    $raw = json_decode($raw, true) ?: [];
                }
                $builtInNames = [];
                if (is_array($raw)) {
                    foreach ($raw as $val) {
                        if (empty($val)) continue;
                        if (is_string($val) && !is_numeric($val)) {
                            $builtInNames[] = trim($val);
                        } elseif (isset($allCategoryMap[$val])) {
                            $builtInNames[] = $allCategoryMap[$val];
                        } else {
                            $builtInNames[] = (string)$val;
                        }
                    }
                }
                $builtInNames = array_values(array_unique(array_filter($builtInNames)));
                if ($eqType) {
                    $eqType->setAttribute('built_in_names', $builtInNames);
                }
                $item->setAttribute('built_in_names', $builtInNames);
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

        $refLower = strtolower($referenceCode);
        $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->whereRaw('LOWER(reference_code) = ?', [$refLower])
            ->first();

        $type = 'venue';
        $record = null;

        if ($tracking) {
            if (in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing', 'equipment'])) {
                $type = 'equipment';
                $record = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber', 'department'])->find($tracking->reservation_id);
            } else {
                $type = 'venue';
                $record = VenueBooking::with(['venue', 'trackingNumber', 'department'])->find($tracking->reservation_id);
            }
        }

        if (!$record) {
            $record = VenueBooking::with(['venue', 'trackingNumber', 'department'])->where('reference_code', $referenceCode)->first();
            if ($record) {
                $type = 'venue';
            } else {
                $record = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber', 'department'])->where('reference_code', $referenceCode)->first();
                if ($record) {
                    $type = 'equipment';
                }
            }
        }

        if (!$record) {
            return response()->json(['message' => 'Reservation record not found.'], 404);
        }

        $currentStatus = strtolower($record->status ?? $record->trackingNumber?->status ?? 'pending');
        if (!in_array($currentStatus, ['incomplete', 'pending'])) {
            return response()->json(['message' => "Cannot resubmit documents for a request in status: {$currentStatus}."], 422);
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
                'venue_booking_id'    => $type === 'venue' ? $record->id : null,
                'equipment_borrow_id' => $type === 'equipment' ? $record->id : null,
                'reservation_type'    => $type === 'venue' ? 'venue_booking' : 'equipment_borrow',
                'reservation_id'      => $record->id,
                'file_path'           => $url,
                'document_type'       => 'resubmitted_requirement',
                'status'              => 'pending',
                'uploaded_at'         => now(),
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }

        if ($request->hasFile('endorsement_file')) {
            $url = $mediaUploadService->upload($request->file('endorsement_file'), 'endorsements');
            $uploadedUrls[] = $url;
            if ($type === 'venue') {
                $record->endorsement_url = $url;
                $record->endorsement_letter = $url;
            } else {
                $record->endorsement_url = $url;
            }
            \Illuminate\Support\Facades\DB::table('documents')->insert([
                'venue_booking_id'    => $type === 'venue' ? $record->id : null,
                'equipment_borrow_id' => $type === 'equipment' ? $record->id : null,
                'reservation_type'    => $type === 'venue' ? 'venue_booking' : 'equipment_borrow',
                'reservation_id'      => $record->id,
                'file_path'           => $url,
                'document_type'       => 'endorsement_letter',
                'status'              => 'pending',
                'uploaded_at'         => now(),
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }

        if (empty($uploadedUrls)) {
            return response()->json(['message' => 'Please select at least one file to upload.'], 422);
        }

        // Transition back to pending / under review
        $record->status = 'pending';
        if (\Illuminate\Support\Facades\Schema::hasColumn($record->getTable(), 'is_complete')) {
            $record->is_complete = true;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn($record->getTable(), 'resubmitted_at')) {
            $record->resubmitted_at = now();
        }
        $record->save();

        if ($tracking) {
            \Illuminate\Support\Facades\DB::table('tracking_numbers')
                ->where('id', $tracking->id)
                ->update(['status' => 'pending']);
        }

        // Broadcast real-time status update
        try {
            $eventName = $type === 'venue' ? 'venue_booking' : 'equipment_borrow';
            event(new \App\Events\BookingStatusUpdated($eventName, $referenceCode, 'pending', $record->id, 'Missing requirements resubmitted by applicant'));
        } catch (\Throwable $e) {}

        // Notify Staff and Super Admin
        try {
            $filerName = $record->filer_name ?? $record->requestor_name ?? 'Applicant';
            \App\Jobs\SendAdminPendingTaskNotificationJob::dispatch(
                'requirements_resubmitted',
                $record,
                "Applicant {$filerName} has uploaded missing requirements for {$type} reservation {$referenceCode}."
            );
        } catch (\Throwable $e) {}

        // Dispatch Email Notification to Requestor
        try {
            \App\Jobs\SendBookingStatusUpdateJob::dispatch(
                $type,
                $record->fresh(),
                'requirements_resubmitted',
                'Your missing requirement documents have been received successfully and your reservation has returned to PENDING REVIEW status.'
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Missing requirements uploaded successfully! Your reservation has been returned to review.',
            'status'  => 'pending',
            'booking' => $record->fresh(),
        ]);
    }
}
