<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\TrackBookingRequest;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use App\Jobs\SendBookingStatusUpdateJob;
use App\Events\BookingStatusUpdated;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    public function track(TrackBookingRequest $request): JsonResponse
    {
        try {
            if (\Illuminate\Support\Facades\Cache::add('bg_booking_checks_throttled', true, 45)) {
                app(\App\Services\NoShowAutoReleaseService::class)->processNoShows();
            }
        } catch (\Throwable $e) {}

        $referenceCode = trim($request->input('reference_code') ?? '');
        $email = trim($request->input('requestor_email') ?? '');

        $booking = null;

        $refLower = strtolower($referenceCode);

        // Prevent bare numeric ID enumeration (e.g. "1", "2", "3"); require a real tracking code format
        $hasPrefix = str_starts_with($refLower, 'trk-') || str_starts_with($refLower, 'eq-') || str_starts_with($refLower, 'vb-') || str_starts_with($refLower, 'eb-');
        $fallbackId = $hasPrefix ? str_replace(['trk-avr', 'trk-', 'eq-2026-', 'eq-'], '', $refLower) : null;

        // 1. Search in tracking_numbers table (case-insensitive)
        $trackingQuery = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->whereRaw('LOWER(reference_code) = ?', [$refLower]);
        if ($fallbackId !== null && is_numeric($fallbackId)) {
            $trackingQuery->orWhere('id', (int) $fallbackId);
        }
        $tracking = $trackingQuery->first();

        if ($tracking) {
            if (in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing'])) {
                $booking = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber', 'department', 'inspections'])
                    ->find($tracking->reservation_id);
            } elseif ($tracking->reservation_type === 'venue_booking') {
                $booking = VenueBooking::with(['venue', 'trackingNumber', 'department', 'inspections'])->where('id', $tracking->reservation_id)->first();
            }
        }

        // 2. Direct fallback on EquipmentBorrow
        if (!$booking) {
            $ebQuery = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber', 'department', 'inspections'])
                ->whereHas('trackingNumber', fn($q) => $q->whereRaw('LOWER(reference_code) = ?', [$refLower]));
            if (str_starts_with($refLower, 'eq-') && $fallbackId !== null && is_numeric($fallbackId)) {
                $ebQuery->orWhere('id', (int) $fallbackId);
            }
            $booking = $ebQuery->first();
        }

        // 3. Direct fallback on VenueBooking
        if (!$booking) {
            $vbQuery = VenueBooking::with(['venue', 'trackingNumber', 'department', 'inspections'])
                ->whereHas('trackingNumber', fn($q) => $q->whereRaw('LOWER(reference_code) = ?', [$refLower]));
            if (str_starts_with($refLower, 'trk-') && $fallbackId !== null && is_numeric($fallbackId)) {
                $vbQuery->orWhere('id', (int) $fallbackId);
            }
            $booking = $vbQuery->first();
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

        // Resolve Assigned Physical Unit(s) with full Brand, Model, Serial Number & Built-in accessories
        $assignedCodes = [];
        if (!empty($booking->assigned_units)) {
            $rawAssigned = is_string($booking->assigned_units) ? json_decode($booking->assigned_units, true) : $booking->assigned_units;
            if (is_array($rawAssigned)) {
                $assignedCodes = array_values(array_filter(array_map('trim', array_map('strval', $rawAssigned))));
            }
        }

        if (!empty($assignedCodes)) {
            $matchedUnits = \App\Models\EquipmentUnit::with('equipmentType')
                ->where(function ($q) use ($assignedCodes) {
                    $q->whereIn('barcode', $assignedCodes)
                      ->orWhereIn('serial_number', $assignedCodes)
                      ->orWhereIn('id', array_filter($assignedCodes, 'is_numeric'));
                })
                ->get();

            $unitDetails = [];
            foreach ($assignedCodes as $code) {
                $unit = $matchedUnits->first(function ($u) use ($code) {
                    return strcasecmp($u->barcode ?? '', $code) === 0 ||
                           strcasecmp($u->serial_number ?? '', $code) === 0 ||
                           (string)$u->id === (string)$code;
                });

                if ($unit) {
                    // Resolve built-in units
                    $childDetails = [];
                    $rawBuiltIns = $unit->built_in_units;
                    if (is_string($rawBuiltIns)) {
                        $rawBuiltIns = json_decode($rawBuiltIns, true) ?: [];
                    }
                    if (is_array($rawBuiltIns) && !empty($rawBuiltIns)) {
                        $childUnits = \App\Models\EquipmentUnit::with('equipmentType')
                            ->where(function ($cq) use ($rawBuiltIns) {
                                $cq->whereIn('id', array_filter($rawBuiltIns, 'is_numeric'))
                                   ->orWhereIn('barcode', $rawBuiltIns)
                                   ->orWhereIn('serial_number', $rawBuiltIns);
                            })
                            ->get();

                        foreach ($childUnits as $cu) {
                            $childDetails[] = [
                                'id'            => $cu->id,
                                'brand'         => $cu->brand ?? '',
                                'model'         => $cu->model ?? '',
                                'serial_number' => $cu->serial_number ?: ($cu->barcode ?: "Unit-{$cu->id}"),
                                'category_name' => $cu->equipmentType?->eq_name ?? '',
                            ];
                        }
                    }

                    $unitDetails[] = [
                        'code'           => $unit->serial_number ?: ($unit->barcode ?: $code),
                        'brand'          => $unit->brand ?? '',
                        'model'          => $unit->model ?? '',
                        'serial_number'  => $unit->serial_number ?: ($unit->barcode ?: $code),
                        'category_name'  => $unit->equipmentType?->eq_name ?? '',
                        'built_in_units' => $childDetails,
                    ];
                } else {
                    $unitDetails[] = [
                        'code'           => $code,
                        'brand'          => '',
                        'model'          => '',
                        'serial_number'  => $code,
                        'category_name'  => '',
                        'built_in_units' => [],
                    ];
                }
            }

            $booking->setAttribute('assigned_unit_details', $unitDetails);
        }

        // Return Past Due Notice email trigger
        if ($booking instanceof EquipmentBorrow) {
            $isPastDue = false;
            $dateOfUsage = $booking->date_of_usage ? substr((string)$booking->date_of_usage, 0, 10) : null;
            $timeEnd = $booking->time_end ?? '17:00:00';
            $schedEndStr = $booking->end_datetime ?? ($dateOfUsage ? "{$dateOfUsage} {$timeEnd}" : null);
            if ($schedEndStr) {
                try {
                    $schedEnd = \Carbon\Carbon::parse($schedEndStr);
                    $now = \Carbon\Carbon::now();
                    $activeStatus = strtolower($booking->status ?? '');
                    if ($now->greaterThan($schedEnd) && in_array($activeStatus, ['ongoing', 'on-going', 'released', 'in-use', 'borrowed'])) {
                        $isPastDue = true;
                    }
                } catch (\Throwable $t) {}
            }

            if ($isPastDue) {
                $alertKey = "overdue_email_sent_track_{$booking->id}";
                if (!\Illuminate\Support\Facades\Cache::has($alertKey)) {
                    $targetEmail = $booking->email_address ?? $booking->requestor_email ?? null;
                    if ($targetEmail) {
                        try {
                            $refCode = $booking->reference_code ?? ($booking->trackingNumber?->reference_code ?? "EQ-2026-{$booking->id}");
                            $pastDueNoticeMsg = "The scheduled return time for the equipment unit(s) borrowed under Reference Code {$refCode} has elapsed. Please return all physical units immediately to the PMO / AVR office finalize condition clearance and prevent late policy penalties.";

                            \Illuminate\Support\Facades\Mail::to($targetEmail)->send(
                                new \App\Mail\BookingStatusUpdateMail(
                                    'equipment',
                                    $booking,
                                    'overdue',
                                    $pastDueNoticeMsg
                                )
                            );
                            \Illuminate\Support\Facades\Cache::put($alertKey, true, now()->addHours(2));
                            \App\Models\CommunicationLog::record([
                                'channel'         => 'email',
                                'category'        => 'overdue_reminder',
                                'recipient_name'  => $booking->filer_name ?? 'Borrower',
                                'recipient_email' => $targetEmail,
                                'reference_code'  => $refCode,
                                'subject'         => "Return Past Due Notice: [{$refCode}]",
                                'message_preview' => $pastDueNoticeMsg,
                                'status'          => 'sent',
                            ]);
                        } catch (\Throwable $mErr) {
                            \Illuminate\Support\Facades\Log::warning("TrackingController: Past due email dispatch error: " . $mErr->getMessage());
                        }
                    }
                }
            }
        }

        if ($booking) {
            $rawEmail = $booking->requestor_email ?? $booking->email_address ?? '';
            $booking->masked_email = self::maskEmail($rawEmail);
        }

        return response()->json($booking);
    }

    public static function maskEmail(?string $email): string
    {
        $email = trim((string)$email);
        if (empty($email) || !str_contains($email, '@')) {
            return '******';
        }
        [$name, $domain] = explode('@', $email, 2);
        $len = strlen($name);
        if ($len <= 2) {
            $maskedName = substr($name, 0, 1) . '*';
        } else {
            $maskedName = substr($name, 0, 1) . str_repeat('*', max(3, $len - 2)) . substr($name, -1);
        }
        return $maskedName . '@' . $domain;
    }

    /**
     * Step 1 of public cancellation:
     * Validates that the provided email matches the booking owner,
     * generates a 6-digit verification code with 10-minute validity,
     * and dispatches it via email to the applicant.
     */
    public function requestCancelOtp(\Illuminate\Http\Request $request): JsonResponse
    {
        $referenceCode = trim($request->input('reference_code') ?? '');
        $inputEmail = strtolower(trim($request->input('email') ?? ''));
        $reason = trim($request->input('reason') ?? 'Cancelled by applicant');

        if (empty($referenceCode)) {
            return response()->json(['message' => 'Reference code is required.'], 422);
        }
        if (empty($inputEmail)) {
            return response()->json(['message' => 'Your registered email address is required to cancel this reservation.'], 422);
        }

        $refLower = strtolower($referenceCode);
        $booking = null;

        $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->whereRaw('LOWER(reference_code) = ?', [$refLower])
            ->first();

        if ($tracking) {
            if (in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing', 'equipment'])) {
                $booking = EquipmentBorrow::find($tracking->reservation_id);
            } else {
                $booking = VenueBooking::find($tracking->reservation_id);
            }
        }

        if (!$booking) {
            $booking = VenueBooking::whereRaw('LOWER(reference_code) = ?', [$refLower])->first();
            if (!$booking) {
                $booking = EquipmentBorrow::whereRaw('LOWER(reference_code) = ?', [$refLower])->first();
            }
        }

        if (!$booking) {
            return response()->json(['message' => 'Reservation record not found.'], 404);
        }

        $currentStatus = strtolower($booking->status ?? 'pending');
        if (in_array($currentStatus, ['completed', 'cancelled', 'returned', 'rejected', 'damaged'])) {
            return response()->json(['message' => 'This reservation can no longer be cancelled.'], 400);
        }

        $actualEmail = strtolower(trim($booking->requestor_email ?? $booking->email_address ?? ''));
        if (empty($actualEmail) || $actualEmail !== $inputEmail) {
            return response()->json([
                'message' => 'The provided email address does not match our records for this reservation. Please check and try again.'
            ], 422);
        }

        $upperRef = strtoupper($referenceCode);
        $cacheKey = "booking_cancel_otp_{$upperRef}";
        $cooldownKey = "booking_cancel_otp_cd_{$upperRef}";

        // Enforce 60-second cooldown between sending OTPs
        if (\Illuminate\Support\Facades\Cache::has($cooldownKey)) {
            $remaining = (int) (\Illuminate\Support\Facades\Cache::get($cooldownKey) - time());
            $remaining = max(1, $remaining);
            return response()->json([
                'message' => "A verification code was recently sent. Please wait {$remaining} second(s) before requesting another code."
            ], 429);
        }

        $plainOtp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expireMinutes = 10;

        \Illuminate\Support\Facades\Cache::put($cacheKey, [
            'otp_hash'       => hash('sha256', $plainOtp),
            'email'          => $actualEmail,
            'reason'         => $reason,
            'reference_code' => $booking->reference_code ?? $referenceCode,
            'attempts'       => 0,
            'expires_at'     => now()->addMinutes($expireMinutes)->timestamp,
        ], now()->addMinutes($expireMinutes));

        \Illuminate\Support\Facades\Cache::put($cooldownKey, time() + 60, 60);

        $recipientName = $booking->filer_name ?? $booking->requester_name ?? $booking->name ?? 'Applicant';

        try {
            \App\Jobs\SendBookingCancellationOtpJob::dispatch(
                $actualEmail,
                $recipientName,
                $booking->reference_code ?? $referenceCode,
                $plainOtp,
                $expireMinutes
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Failed to dispatch cancellation OTP job: " . $e->getMessage());
        }

        return response()->json([
            'success'      => true,
            'message'      => 'A 6-digit cancellation verification code has been sent to your email.',
            'masked_email' => self::maskEmail($actualEmail),
        ]);
    }

    /**
     * Step 2 of public cancellation:
     * Verifies the 6-digit OTP code against the cached SHA-256 hash.
     * Enforces a maximum of 5 attempts. Once verified, permanently cancels the booking,
     * frees assigned assets, sends cancellation confirmation, and logs the audit trail.
     */
    public function cancel(\Illuminate\Http\Request $request): JsonResponse
    {
        $referenceCode = trim($request->input('reference_code') ?? '');
        $inputEmail = strtolower(trim($request->input('email') ?? ''));
        $otpCode = trim($request->input('otp_code') ?? '');
        $reason = trim($request->input('reason') ?? 'Cancelled by applicant');

        if (empty($referenceCode)) {
            return response()->json(['message' => 'Reference code is required.'], 422);
        }
        if (empty($inputEmail)) {
            return response()->json(['message' => 'Your registered email address is required.'], 422);
        }
        if (empty($otpCode)) {
            return response()->json(['message' => 'The 6-digit verification code is required to confirm cancellation.'], 422);
        }

        $upperRef = strtoupper($referenceCode);
        $cacheKey = "booking_cancel_otp_{$upperRef}";
        $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);

        if (!$cached) {
            return response()->json([
                'message' => 'The verification code has expired or was not requested. Please request a new code.'
            ], 422);
        }

        if (($cached['attempts'] ?? 0) >= 5) {
            \Illuminate\Support\Facades\Cache::forget($cacheKey);
            return response()->json([
                'message' => 'Too many failed attempts. For security reasons, this request has expired. Please request a new verification code.'
            ], 429);
        }

        $submittedHash = hash('sha256', $otpCode);
        if (!hash_equals((string)($cached['otp_hash'] ?? ''), $submittedHash)) {
            $cached['attempts'] = ($cached['attempts'] ?? 0) + 1;
            $remaining = 5 - $cached['attempts'];
            \Illuminate\Support\Facades\Cache::put($cacheKey, $cached, now()->addMinutes(10));
            return response()->json([
                'message' => "Incorrect verification code. {$remaining} attempt(s) remaining."
            ], 422);
        }

        if (strtolower(trim($inputEmail)) !== strtolower(trim($cached['email'] ?? ''))) {
            return response()->json(['message' => 'Email address verification failed.'], 422);
        }

        // Successfully verified! Clear OTP cache
        \Illuminate\Support\Facades\Cache::forget($cacheKey);
        \Illuminate\Support\Facades\Cache::forget("booking_cancel_otp_cd_{$upperRef}");

        $refLower = strtolower($referenceCode);
        $tracking = \Illuminate\Support\Facades\DB::table('tracking_numbers')
            ->whereRaw('LOWER(reference_code) = ?', [$refLower])
            ->first();

        if ($tracking && $tracking->reservation_type === 'venue_booking') {
            $vb = VenueBooking::find($tracking->reservation_id);
            if ($vb) {
                if (in_array(strtolower($vb->status), ['completed', 'cancelled', 'rejected', 'damaged'])) {
                    return response()->json(['message' => 'This reservation can no longer be cancelled.'], 400);
                }
                $vb->update(['status' => 'cancelled', 'rejection_reason' => $reason]);
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $tracking->id)->update(['status' => 'cancelled']);

                // Release assigned units if any
                $assigned = $vb->assigned_units ?? [];
                if (is_string($assigned)) {
                    try { $assigned = json_decode($assigned, true); } catch (\Throwable $t) { $assigned = []; }
                }
                if (is_array($assigned) && !empty($assigned) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                    $codes = array_values(array_filter($assigned));
                    \App\Models\EquipmentUnit::whereIn('barcode', $codes)
                        ->whereIn('status', ['reserved', 'released'])
                        ->update(['status' => 'available']);
                }

                if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                    \App\Models\Approval::forceCreate([
                        'reference_type' => 'avr_venue_booking',
                        'reference_id'   => $vb->id,
                        'action'         => 'cancelled',
                        'remarks'        => $reason ?: 'Cancelled by applicant via OTP verification',
                        'approved_by'    => null,
                    ]);
                }

                try {
                    SendBookingStatusUpdateJob::dispatch('venue', $vb->fresh(['venue', 'trackingNumber', 'documents']), 'cancelled', $reason);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("TrackingController cancel venue email failed: " . $e->getMessage());
                }

                try {
                    event(new BookingStatusUpdated('venue_booking', $tracking->reference_code ?? $referenceCode, 'cancelled', $vb->id, $reason));
                } catch (\Throwable $e) {}

                return response()->json(['message' => 'Venue reservation successfully cancelled.', 'status' => 'cancelled']);
            }
        }

        if ($tracking && in_array($tracking->reservation_type, ['equipment_borrow', 'equipment_borrowing', 'equipment'])) {
            $eb = EquipmentBorrow::find($tracking->reservation_id);
            if ($eb) {
                if (in_array(strtolower($eb->status), ['completed', 'cancelled', 'returned', 'rejected', 'damaged'])) {
                    return response()->json(['message' => 'This borrowing can no longer be cancelled.'], 400);
                }
                $eb->forceFill(['status' => 'cancelled', 'rejection_reason' => $reason])->save();
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $tracking->id)->update(['status' => 'cancelled']);

                // Release assigned units if any
                $assigned = $eb->assigned_units ?? [];
                if (is_string($assigned)) {
                    try { $assigned = json_decode($assigned, true); } catch (\Throwable $t) { $assigned = []; }
                }
                if (is_array($assigned) && !empty($assigned) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                    $codes = array_values(array_filter($assigned));
                    \App\Models\EquipmentUnit::whereIn('barcode', $codes)
                        ->whereIn('status', ['reserved', 'released'])
                        ->update(['status' => 'available']);
                }

                if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                    \App\Models\Approval::forceCreate([
                        'reference_type' => 'equipment_borrowing',
                        'reference_id'   => $eb->id,
                        'action'         => 'cancelled',
                        'remarks'        => $reason ?: 'Cancelled by applicant via OTP verification',
                        'approved_by'    => null,
                    ]);
                }

                try {
                    SendBookingStatusUpdateJob::dispatch('equipment', $eb->fresh(['items.equipmentType', 'trackingNumber']), 'cancelled', $reason);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("TrackingController cancel equipment email failed: " . $e->getMessage());
                }

                try {
                    event(new BookingStatusUpdated('equipment_borrowing', $tracking->reference_code ?? $referenceCode, 'cancelled', $eb->id, $reason));
                } catch (\Throwable $e) {}

                return response()->json(['message' => 'Equipment borrowing successfully cancelled.', 'status' => 'cancelled']);
            }
        }

        // Direct fallback on EquipmentBorrow
        $eb = EquipmentBorrow::whereRaw('LOWER(reference_code) = ?', [$refLower])->first();
        if ($eb) {
            if (in_array(strtolower($eb->status), ['completed', 'cancelled', 'returned', 'rejected', 'damaged'])) {
                return response()->json(['message' => 'This borrowing can no longer be cancelled.'], 400);
            }
            $eb->forceFill(['status' => 'cancelled', 'rejection_reason' => $reason])->save();
            if ($eb->tracking_number_id) {
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $eb->tracking_number_id)->update(['status' => 'cancelled']);
            }

            // Release assigned units if any
            $assigned = $eb->assigned_units ?? [];
            if (is_string($assigned)) {
                try { $assigned = json_decode($assigned, true); } catch (\Throwable $t) { $assigned = []; }
            }
            if (is_array($assigned) && !empty($assigned) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                $codes = array_values(array_filter($assigned));
                \App\Models\EquipmentUnit::whereIn('barcode', $codes)
                    ->whereIn('status', ['reserved', 'released'])
                    ->update(['status' => 'available']);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                \App\Models\Approval::forceCreate([
                    'reference_type' => 'equipment_borrowing',
                    'reference_id'   => $eb->id,
                    'action'         => 'cancelled',
                    'remarks'        => $reason ?: 'Cancelled by applicant via OTP verification',
                    'approved_by'    => null,
                ]);
            }

            try {
                SendBookingStatusUpdateJob::dispatch('equipment', $eb->fresh(['items.equipmentType', 'trackingNumber']), 'cancelled', $reason);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("TrackingController fallback cancel equipment email failed: " . $e->getMessage());
            }

            try {
                event(new BookingStatusUpdated('equipment_borrowing', $referenceCode, 'cancelled', $eb->id, $reason));
            } catch (\Throwable $e) {}

            return response()->json(['message' => 'Equipment borrowing successfully cancelled.', 'status' => 'cancelled']);
        }

        // Direct fallback on VenueBooking
        $vb = VenueBooking::whereRaw('LOWER(reference_code) = ?', [$refLower])->first();
        if ($vb) {
            if (in_array(strtolower($vb->status), ['completed', 'cancelled', 'rejected', 'damaged'])) {
                return response()->json(['message' => 'This reservation can no longer be cancelled.'], 400);
            }
            $vb->update(['status' => 'cancelled', 'rejection_reason' => $reason]);
            if ($vb->tracking_number_id) {
                \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $vb->tracking_number_id)->update(['status' => 'cancelled']);
            }

            // Release assigned units if any
            $assigned = $vb->assigned_units ?? [];
            if (is_string($assigned)) {
                try { $assigned = json_decode($assigned, true); } catch (\Throwable $t) { $assigned = []; }
            }
            if (is_array($assigned) && !empty($assigned) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                $codes = array_values(array_filter($assigned));
                \App\Models\EquipmentUnit::whereIn('barcode', $codes)
                    ->whereIn('status', ['reserved', 'released'])
                    ->update(['status' => 'available']);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                \App\Models\Approval::forceCreate([
                    'reference_type' => 'avr_venue_booking',
                    'reference_id'   => $vb->id,
                    'action'         => 'cancelled',
                    'remarks'        => $reason ?: 'Cancelled by applicant via OTP verification',
                    'approved_by'    => null,
                ]);
            }

            try {
                SendBookingStatusUpdateJob::dispatch('venue', $vb->fresh(['venue', 'trackingNumber', 'documents']), 'cancelled', $reason);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("TrackingController fallback cancel venue email failed: " . $e->getMessage());
            }

            try {
                event(new BookingStatusUpdated('venue_booking', $referenceCode, 'cancelled', $vb->id, $reason));
            } catch (\Throwable $e) {}

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

        $ownerEmail = strtolower(trim($record->requestor_email ?? $record->email_address ?? ''));
        $inputEmail = strtolower(trim($request->input('email') ?? $request->input('requestor_email') ?? ''));
        if (!empty($ownerEmail) && !empty($inputEmail) && $ownerEmail !== $inputEmail) {
            return response()->json(['message' => 'The provided email address does not match this reservation.'], 403);
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
