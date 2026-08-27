<?php

namespace App\Services;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\VenueOverlapException;
use App\Exceptions\VenueReservationTooSoonException;
use App\Jobs\SendBookingConfirmationJob;
use App\Jobs\SendBookingStatusUpdateJob;
use App\Models\Approval;
use App\Models\VenueBooking;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;

class VenueBookingService
{
    public function __construct(
        private AuditLogService $auditLog,
        private NotificationService $notification
    ) {}

    public function create(array $data): VenueBooking
    {
        return DB::transaction(function () use ($data) {
            $startDt = $data['start_datetime'] ?? ($data['date_of_usage'] . ' ' . ($data['time_start'] ?? '08:00:00'));
            $reservationEndDate = $data['reservation_end_date'] ?? $data['end_date'] ?? ($data['date_of_usage'] ?? date('Y-m-d', strtotime($startDt)));
            $endDt   = $data['end_datetime']   ?? ($reservationEndDate . ' ' . ($data['time_end'] ?? '12:00:00'));

            // Parse date, time_start, time_end
            $dateOfUsage = date('Y-m-d', strtotime($startDt));
            $reservationEndDate = date('Y-m-d', strtotime($endDt));
            $timeStart   = date('H:i:s', strtotime($startDt));
            $timeEnd     = date('H:i:s', strtotime($endDt));

            if (strtotime($endDt) <= strtotime($startDt)) {
                throw new \InvalidArgumentException('Reservation end datetime must be strictly ahead of start datetime.');
            }

            // Enforce at least 3 days advance notice for public / student / external reservations UNLESS PIN verified
            $isPinVerified = !empty($data['is_pin_verified']) 
                || !empty($data['pin_override']) 
                || (isset($data['is_pin_verified']) && in_array($data['is_pin_verified'], [1, '1', true, 'true'], true))
                || (isset($data['pin_override']) && in_array($data['pin_override'], [1, '1', true, 'true'], true))
                || !empty($data['submitted_by']);

            if (!$isPinVerified) {
                $earliestAllowed = now()->addDays(3)->startOfDay();
                if (strtotime($dateOfUsage) < $earliestAllowed->timestamp) {
                    throw new VenueReservationTooSoonException('Venue bookings must be made at least 3 days in advance.');
                }
            }

            $venue = Venue::where('id', $data['venue_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $hasOverlap = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('venue_bookings.venue_id', $venue->id)
                ->whereIn('tracking_numbers.status', ['pending', 'approved'])
                ->where(function ($q) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                    $q->where(function ($sub) use ($dateOfUsage, $timeStart, $timeEnd) {
                        $sub->where('venue_bookings.date_of_usage', '<=', $dateOfUsage)
                            ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$dateOfUsage])
                            ->where('venue_bookings.time_start', '<', $timeEnd)
                            ->where('venue_bookings.time_end', '>', $timeStart);
                    })->orWhere(function ($sub2) use ($dateOfUsage, $reservationEndDate, $timeStart, $timeEnd) {
                        $sub2->where('venue_bookings.date_of_usage', '<=', $reservationEndDate)
                            ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$dateOfUsage])
                            ->where('venue_bookings.time_start', '<', $timeEnd)
                            ->where('venue_bookings.time_end', '>', $timeStart);
                    });
                })
                ->exists();

            if ($hasOverlap) {
                throw new VenueOverlapException('This venue is already booked for the selected date and time range.');
            }

            $referenceCode = 'TRK-AVR' . rand(1000, 9999);

            // Create tracking number entry
            $trackingId = DB::table('tracking_numbers')->insertGetId([
                'reference_code'   => $referenceCode,
                'reservation_type' => 'venue_booking',
                'reservation_id'   => 0,
                'status'           => 'pending',
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            $filerName = $data['requestor_name'] ?? $data['filer_name'] ?? 'Requestor';
            $email     = $data['requestor_email'] ?? $data['email_address'] ?? 'user@fsuu.edu.ph';
            $contact   = $data['requestor_contact_number'] ?? $data['contact_number'] ?? '09171234567';
            $office    = $data['requestor_program_office'] ?? $data['program_office'] ?? 'Department';
            $classif   = $data['requestor_identity_type'] ?? $data['classification'] ?? 'student';
            $purpose   = $data['purpose'] ?? 'Academic Activity';
            $persons   = $data['number_of_persons'] ?? $data['no_of_person'] ?? 50;

            // Create venue_booking entry
            $insertData = [
                'tracking_number_id'   => $trackingId,
                'venue_id'             => $venue->id,
                'submission_channel'   => 'online_self',
                'filer_name'           => $filerName,
                'email_address'        => $email,
                'program_office'       => $office,
                'contact_number'       => $contact,
                'classification'       => $classif,
                'place_of_use'         => 'inside',
                'purpose'              => $purpose,
                'no_of_person'         => $persons,
                'date_of_usage'        => $dateOfUsage,
                'reservation_end_date' => $reservationEndDate,
                'time_start'           => $timeStart,
                'time_end'             => $timeEnd,
                'equipment_notes'      => $data['equipment_notes'] ?? null,
                'agreed_to_policy'     => true,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'academic_term_id')) {
                $activeTermId = null;
                if (\Illuminate\Support\Facades\Schema::hasTable('academic_terms')) {
                    $activeTermId = \Illuminate\Support\Facades\DB::table('academic_terms')
                        ->where('is_active', true)
                        ->value('id')
                        ?: \Illuminate\Support\Facades\DB::table('academic_terms')->value('id');
                }
                $insertData['academic_term_id'] = $activeTermId ?: null;
            }

            if (!empty($data['endorsement_url'])) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'endorsement_url')) {
                    $insertData['endorsement_url'] = $data['endorsement_url'];
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'endorsement_letter')) {
                    $insertData['endorsement_letter'] = $data['endorsement_url'];
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'reference_code')) {
                $insertData['reference_code'] = $referenceCode;
            }

            $bookingId = DB::table('venue_bookings')->insertGetId($insertData);

            DB::table('tracking_numbers')->where('id', $trackingId)->update(['reservation_id' => $bookingId]);

            // Save requested equipment into venue_booking_equipment table with quantity_requested
            if (\Illuminate\Support\Facades\Schema::hasTable('venue_booking_equipment')) {
                $rawItems = $data['equipment_items'] ?? null;
                if (is_string($rawItems)) {
                    try { $rawItems = json_decode($rawItems, true); } catch (\Throwable $t) { $rawItems = null; }
                }

                if (is_array($rawItems) && !empty($rawItems)) {
                    foreach ($rawItems as $it) {
                        $eqId = $it['equipment_type_id'] ?? $it['id'] ?? null;
                        $qty = (int)($it['quantity_requested'] ?? $it['quantity'] ?? 1);
                        if ($eqId) {
                            DB::table('venue_booking_equipment')->insert([
                                'venue_booking_id'   => $bookingId,
                                'equipment_type_id'  => $eqId,
                                'quantity_requested' => max(1, $qty),
                                'created_at'         => now(),
                                'updated_at'         => now(),
                            ]);
                        }
                    }
                } else {
                    $equipNotes = $data['equipment_notes'] ?? '';
                    if (!empty($equipNotes)) {
                        $items = array_map('trim', explode(',', $equipNotes));
                        foreach ($items as $itemStr) {
                            if (empty($itemStr)) continue;
                            $cleanName = trim(explode('(', $itemStr)[0]);
                            $qty = 1;
                            if (preg_match('/\(Qty:\s*(\d+)\)/i', $itemStr, $m)) {
                                $qty = (int)$m[1];
                            }
                            $eqType = DB::table('equipment_types')
                                ->where('eq_name', 'LIKE', "%{$cleanName}%")
                                ->first();
                            if ($eqType) {
                                DB::table('venue_booking_equipment')->insert([
                                    'venue_booking_id'   => $bookingId,
                                    'equipment_type_id'  => $eqType->id,
                                    'quantity_requested' => max(1, $qty),
                                    'others_specify'    => $itemStr,
                                    'created_at'         => now(),
                                    'updated_at'         => now(),
                                ]);
                            }
                        }
                    }
                }
            }

            if (!empty($data['endorsement_url'])) {
                if (\Illuminate\Support\Facades\Schema::hasTable('documents')) {
                    DB::table('documents')->insert([
                        'venue_booking_id' => $bookingId,
                        'file_path'        => $data['endorsement_url'],
                        'document_type'    => 'endorsement_letter',
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);
                }
            }

            $booking = VenueBooking::with('venue', 'trackingNumber', 'documents')->find($bookingId);

            // Dispatch email confirmation to requestor
            try {
                SendBookingConfirmationJob::dispatch('venue', $booking);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to dispatch venue booking confirmation email: ' . $e->getMessage());
            }

            // Dispatch real-time Pusher event
            try {
                event(new \App\Events\BookingCreated(
                    'venue_booking',
                    $referenceCode,
                    $filerName,
                    $office,
                    $venue->name ?? 'AVR Facility',
                    $dateOfUsage,
                    $timeStart,
                    $timeEnd,
                    $bookingId
                ));
            } catch (\Throwable $e) {}

            return $booking;
        });
    }

    public function approve(VenueBooking $booking, User $actor, ?string $remarks = null): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'approved'])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => 'approved']);

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                DB::table('approvals')->insert([
                    'reference_type' => 'avr_venue_booking',
                    'reference_id'   => $booking->id,
                    'action'         => 'approved',
                    'remarks'        => $remarks,
                    'approved_by'    => $actor->id,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            $this->auditLog->log($actor, 'booking_approved', 'avr_venue_booking', $booking->id);

            $notificationType = $booking->requestor_identity_type === 'external'
                ? 'payment_required'
                : 'venue_secured';

            $this->notification->log(
                'avr_venue_booking',
                $booking->id,
                $notificationType,
                $booking->contact_preference ?? 'email',
                $booking->email_address ?? $booking->requestor_email
            );

            // Send status update email asynchronously
            SendBookingStatusUpdateJob::dispatch('venue', $booking->fresh('venue'), 'approved', $remarks);

            // Broadcast real-time status update
            try {
                $ref = $booking->reference_code ?? $booking->trackingNumber?->reference_code ?? ('TRK-VB-' . $booking->id);
                event(new \App\Events\BookingStatusUpdated('venue_booking', $ref, 'approved', $booking->id, $remarks));
            } catch (\Throwable $e) {}

            return $booking->fresh();
        });
    }

    public function reject(VenueBooking $booking, User $actor, string $remarks): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'rejected'])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => 'rejected']);

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                DB::table('approvals')->insert([
                    'reference_type' => 'avr_venue_booking',
                    'reference_id'   => $booking->id,
                    'action'         => 'rejected',
                    'remarks'        => $remarks,
                    'approved_by'    => $actor->id,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            $this->auditLog->log($actor, 'booking_rejected', 'avr_venue_booking', $booking->id);

            $this->notification->log(
                'avr_venue_booking',
                $booking->id,
                'booking_rejected',
                $booking->contact_preference ?? 'email',
                $booking->email_address ?? $booking->requestor_email
            );

            // Send status update email asynchronously with rejection comments directly to requestor email
            SendBookingStatusUpdateJob::dispatch('venue', $booking->fresh(), 'rejected', $remarks);

            return $booking->fresh();
        });
    }

    public function cancel(VenueBooking $booking, User $actor, ?string $remarks = null): VenueBooking
    {
        $this->assertCancelAllowed($booking, $actor);

        return DB::transaction(function () use ($booking, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'cancelled'])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => 'cancelled']);

            Approval::forceCreate([
                'reference_type' => 'avr_venue_booking',
                'reference_id' => $booking->id,
                'action' => 'cancelled',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'booking_cancelled', 'avr_venue_booking', $booking->id);

            $this->notification->log(
                'avr_venue_booking',
                $booking->id,
                'booking_cancelled',
                $booking->contact_preference,
                $booking->contact_preference === 'email' ? $booking->requestor_email : $booking->requestor_contact_number
            );

            // Send status update email asynchronously
            SendBookingStatusUpdateJob::dispatch('venue', $booking->fresh(), 'cancelled', $remarks);

            return $booking->fresh();
        });
    }

    public function ongoing(VenueBooking $booking, ?User $actor = null): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'on-going'])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => 'on-going']);

            // Update assigned physical units status to 'released'
            $assigned = $booking->assigned_units ?? [];
            if (is_string($assigned)) {
                try { $assigned = json_decode($assigned, true); } catch (\Throwable $t) { $assigned = []; }
            }
            $barcodes = [];
            if (is_array($assigned)) {
                foreach ($assigned as $val) {
                    if ($val) $barcodes[] = trim((string)$val);
                }
            }
            if (!empty($barcodes) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                $numericIds = array_values(array_filter($barcodes, fn($v) => is_numeric($v) && (int)$v > 0));
                $unitCodes = array_values(array_filter($barcodes, fn($v) => !empty($v)));

                \App\Models\EquipmentUnit::where(function($q) use ($unitCodes, $numericIds) {
                    $q->whereIn('unit_code', $unitCodes);
                    if (!empty($numericIds)) {
                        $q->orWhereIn('id', array_map('intval', $numericIds));
                    }
                })->update(['status' => 'released']);
            }

            try {
                if ($actor) {
                    $this->auditLog->log($actor, 'booking_ongoing', 'avr_venue_booking', $booking->id);
                }
            } catch (\Throwable $e) {}

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function postInspection(VenueBooking $booking, ?User $actor = null): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'post-inspection'])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => 'post-inspection']);

            try {
                if ($actor) {
                    $this->auditLog->log($actor, 'booking_post_inspection', 'avr_venue_booking', $booking->id);
                }
            } catch (\Throwable $e) {}

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function complete(VenueBooking $booking, ?User $actor = null, array $data = []): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $data) {
            $unitConditions = $data['unit_conditions'] ?? null;
            if (is_string($unitConditions)) {
                try { $unitConditions = json_decode($unitConditions, true); } catch (\Throwable $t) { $unitConditions = []; }
            }

            // Determine overall room booking outcome (damaged if violation reported, else completed)
            $newStatus = (!empty($data['has_damage']) || ($data['status'] ?? '') === 'damaged' || ($data['inspection_status'] ?? '') === 'violation' || ($data['condition'] ?? '') === 'damaged')
                ? 'damaged'
                : 'completed';

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => $newStatus])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => $newStatus]);

            // Automatic late completion detection
            $rawDate = $booking->reservation_end_date ?? $booking->date_of_usage ?? date('Y-m-d');
            $scheduledEndDate = is_string($rawDate) ? substr($rawDate, 0, 10) : date('Y-m-d');
            $rawTime = $booking->time_end ?? '17:00:00';
            $scheduledEndTime = is_string($rawTime) ? (strlen($rawTime) > 8 ? substr($rawTime, 0, 8) : $rawTime) : '17:00:00';
            $scheduledEndStr = "{$scheduledEndDate} {$scheduledEndTime}";

            $now = \Carbon\Carbon::now();
            $isLateCalculated = false;
            $minutesLate = 0;

            try {
                $scheduledEnd = \Carbon\Carbon::parse($scheduledEndStr);
                if ($now->greaterThan($scheduledEnd)) {
                    $isLateCalculated = true;
                    $minutesLate = (int) $scheduledEnd->diffInMinutes($now);
                }
            } catch (\Throwable $e) {}

            if (isset($data['is_late'])) {
                $isLate = filter_var($data['is_late'], FILTER_VALIDATE_BOOLEAN);
            } else if (isset($data['timeliness'])) {
                $isLate = ($data['timeliness'] === 'late');
            } else {
                $isLate = $isLateCalculated;
            }
            $timeliness = $isLate ? 'late' : 'on_time';
            if (!$isLate) {
                $minutesLate = 0;
            }

            // Always ensure inspection record exists on completion
            if (\Illuminate\Support\Facades\Schema::hasTable('inspections')) {
                $existingInsp = DB::table('inspections')
                    ->where('inspectable_id', $booking->id)
                    ->where(function($q) {
                        $q->where('inspectable_type', \App\Models\VenueBooking::class)
                          ->orWhere('inspectable_type', 'venue_booking')
                          ->orWhere('inspectable_type', 'avr_venue_booking');
                    })
                    ->first();

                $condition = ($newStatus === 'damaged' || !empty($data['has_damage'])) ? 'damaged' : ($data['condition'] ?? 'good');
                $photo = $data['evidence_photo'] ?? $data['evidence_image'] ?? null;
                $violationType = $data['violation_type'] ?? ($isLate ? 'Late Return / Extension' : ($condition === 'damaged' ? 'Physical Facility / Equipment Damage' : null));
                $notes = $data['notes'] ?? $data['remarks'] ?? ($isLate ? "Completed {$minutesLate} minutes after scheduled end." : ($condition === 'damaged' ? 'Venue equipment damage reported.' : 'Inspection completed on time.'));

                $actorId = $actor->id ?? null;
                $validUserId = ($actorId && \App\Models\User::where('id', $actorId)->exists()) ? $actorId : (\App\Models\User::value('id') ?? 1);

                $inspData = [
                    'inspectable_type' => \App\Models\VenueBooking::class,
                    'inspectable_id'   => $booking->id,
                    'inspected_by'     => $validUserId,
                    'inspection_type'  => 'post_event',
                    'condition'        => $condition,
                    'is_late'          => $isLate,
                    'timeliness'       => $timeliness,
                    'minutes_late'     => $minutesLate,
                    'notes'            => $notes,
                    'assigned_units'   => is_array($booking->assigned_units) ? json_encode($booking->assigned_units) : $booking->assigned_units,
                    'unit_conditions'  => is_array($unitConditions) ? json_encode($unitConditions) : (is_string($unitConditions) ? $unitConditions : null),
                    'inspected_at'     => now(),
                    'updated_at'       => now(),
                ];
                if ($photo && \Illuminate\Support\Facades\Schema::hasColumn('inspections', 'evidence_photo')) {
                    $inspData['evidence_photo'] = $photo;
                }
                if ($violationType && \Illuminate\Support\Facades\Schema::hasColumn('inspections', 'violation_type')) {
                    $inspData['violation_type'] = $violationType;
                }

                if ($existingInsp) {
                    DB::table('inspections')->where('id', $existingInsp->id)->update($inspData);
                } else {
                    $inspData['created_at'] = now();
                    DB::table('inspections')->insert($inspData);
                }
            }

            // Release assigned equipment units back based on individual inspection conditions
            $assigned = $data['assigned_units'] ?? $booking->assigned_units ?? [];
            if (is_string($assigned)) {
                $assigned = json_decode($assigned, true) ?? [];
            }
            $barcodes = [];
            if (is_array($assigned)) {
                foreach ($assigned as $val) {
                    if ($val) $barcodes[] = trim((string)$val);
                }
            }

            if (!empty($barcodes) && \Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                $damagedBarcodes = [];
                $lostBarcodes = [];
                $goodBarcodes = [];

                if (is_array($unitConditions) && !empty($unitConditions)) {
                    foreach ($barcodes as $bCode) {
                        $bCodeTrim = trim((string)$bCode);
                        $matchedCond = 'Good';

                        // Check direct barcode key or positional key
                        if (isset($unitConditions[$bCodeTrim])) {
                            $matchedCond = is_array($unitConditions[$bCodeTrim]) ? ($unitConditions[$bCodeTrim]['condition'] ?? 'Good') : (string)$unitConditions[$bCodeTrim];
                        } else {
                            foreach ($unitConditions as $k => $cVal) {
                                $posBarcode = $assigned[$k] ?? null;
                                if ($posBarcode && trim((string)$posBarcode) === $bCodeTrim) {
                                    $matchedCond = is_array($cVal) ? ($cVal['condition'] ?? 'Good') : (string)$cVal;
                                    break;
                                }
                            }
                        }

                        $condNorm = ucfirst(strtolower(trim($matchedCond)));
                        if ($condNorm === 'Damaged') {
                            $damagedBarcodes[] = $bCodeTrim;
                        } elseif ($condNorm === 'Lost') {
                            $lostBarcodes[] = $bCodeTrim;
                        } else {
                            $goodBarcodes[] = $bCodeTrim;
                        }
                    }
                } else {
                    $goodBarcodes = $barcodes;
                }

                $applyStatusUpdate = function(array $codes, string $status, string $condition) {
                    if (empty($codes)) return;
                    $numericIds = array_values(array_filter($codes, fn($v) => is_numeric($v) && (int)$v > 0));
                    $unitCodes = array_values(array_filter($codes, fn($v) => !empty($v)));

                    \App\Models\EquipmentUnit::where(function($q) use ($unitCodes, $numericIds) {
                        $q->whereIn('unit_code', $unitCodes);
                        if (!empty($numericIds)) {
                            $q->orWhereIn('id', array_map('intval', $numericIds));
                        }
                    })->update(['status' => $status, 'condition' => $condition]);
                };

                $applyStatusUpdate($goodBarcodes, 'available', 'Good');
                $applyStatusUpdate($damagedBarcodes, 'unavailable', 'Damaged');
                $applyStatusUpdate($lostBarcodes, 'unavailable', 'Lost');
            }

            try {
                if ($actor) {
                    $this->auditLog->log($actor, 'booking_completed', 'avr_venue_booking', $booking->id);
                }
            } catch (\Throwable $e) {}

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function undo(VenueBooking $booking, ?User $actor = null): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'approved'])->save();
            }

            DB::table('tracking_numbers')
                ->where('id', $booking->tracking_number_id)
                ->orWhere('reference_code', $booking->reference_code)
                ->orWhere(function($q) use ($booking) {
                    $q->where('reservation_type', 'venue_booking')->where('reservation_id', $booking->id);
                })
                ->update(['status' => 'approved']);

            try {
                if ($actor) {
                    $this->auditLog->log($actor, 'booking_undo', 'avr_venue_booking', $booking->id);
                }
            } catch (\Throwable $e) {}

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function override(VenueBooking $booking, User $actor, array $data): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $data) {
            $updateData = array_filter([
                'filer_name'      => $data['filer_name'] ?? $data['requestor_name'] ?? null,
                'email_address'   => $data['email_address'] ?? $data['requestor_email'] ?? null,
                'contact_number'  => $data['contact_number'] ?? $data['requestor_contact_number'] ?? null,
                'program_office'  => $data['program_office'] ?? $data['requestor_program_office'] ?? null,
                'purpose'         => $data['purpose'] ?? null,
                'no_of_person'    => $data['no_of_person'] ?? $data['number_of_persons'] ?? null,
                'date_of_usage'   => isset($data['date_of_usage']) ? date('Y-m-d', strtotime($data['date_of_usage'])) : null,
                'time_start'      => isset($data['time_start']) ? date('H:i:s', strtotime($data['time_start'])) : null,
                'time_end'        => isset($data['time_end']) ? date('H:i:s', strtotime($data['time_end'])) : null,
                'equipment_notes' => $data['equipment_notes'] ?? null,
            ], fn($v) => !is_null($v));

            if (isset($data['start_datetime'])) {
                $updateData['date_of_usage'] = date('Y-m-d', strtotime($data['start_datetime']));
                $updateData['time_start']    = date('H:i:s', strtotime($data['start_datetime']));
            }
            if (isset($data['end_datetime'])) {
                $updateData['time_end'] = date('H:i:s', strtotime($data['end_datetime']));
            }

            $booking->update($updateData);

            if (isset($data['status'])) {
                $newStatus = strtolower($data['status']);
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                    $booking->forceFill(['status' => $newStatus])->save();
                }
                DB::table('tracking_numbers')
                    ->where('id', $booking->tracking_number_id)
                    ->orWhere('reference_code', $booking->reference_code)
                    ->update(['status' => $newStatus]);
            }

            $this->auditLog->log($actor, 'booking_override', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    private function assertCancelAllowed(VenueBooking $booking, User $actor): void
    {
        $isWithinFinalWindow = now()->diffInHours($booking->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $actor->isStaff()) {
            throw new BookingActionNotAllowedException(
                'Staff can no longer cancel this booking within 24 hours of the event. Only Head or Admin can proceed.'
            );
        }
    }
}
