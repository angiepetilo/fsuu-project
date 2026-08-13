<?php

namespace App\Services;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\VenueOverlapException;
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
        private ReferenceCodeService $referenceCodeService,
        private AuditLogService $auditLog,
        private NotificationService $notification
    ) {}

    public function create(array $data): VenueBooking
    {
        return DB::transaction(function () use ($data) {
            $startDt = $data['start_datetime'] ?? ($data['date_of_usage'] . ' ' . ($data['time_start'] ?? '08:00:00'));
            $endDt   = $data['end_datetime']   ?? ($data['date_of_usage'] . ' ' . ($data['time_end'] ?? '12:00:00'));

            // Parse date, time_start, time_end
            $dateOfUsage = date('Y-m-d', strtotime($startDt));
            $timeStart   = date('H:i:s', strtotime($startDt));
            $timeEnd     = date('H:i:s', strtotime($endDt));

            $venue = Venue::where('id', $data['venue_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $hasOverlap = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('venue_bookings.venue_id', $venue->id)
                ->whereIn('tracking_numbers.status', ['pending', 'approved'])
                ->where('venue_bookings.date_of_usage', $dateOfUsage)
                ->where('venue_bookings.time_start', '<', $timeEnd)
                ->where('venue_bookings.time_end', '>', $timeStart)
                ->exists();

            if ($hasOverlap) {
                throw new VenueOverlapException();
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

            $reservationEndDate = $data['reservation_end_date'] ?? $data['end_date'] ?? date('Y-m-d', strtotime($data['end_datetime'] ?? $dateOfUsage));

            // Create venue_booking entry
            $insertData = [
                'tracking_number_id'   => $trackingId,
                'venue_id'             => $venue->id,
                'submitted_by'         => $data['submitted_by'] ?? null,
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
                'school_id'            => $data['school_id'] ?? null,
                'agreed_to_policy'     => true,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];

            if (!empty($data['endorsement_url'])) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'endorsement_url')) {
                    $insertData['endorsement_url'] = $data['endorsement_url'];
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'endorsement_letter')) {
                    $insertData['endorsement_letter'] = $data['endorsement_url'];
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'province')) {
                $insertData['province'] = 'Agusan del Norte';
                $insertData['city'] = 'Butuan City';
                $insertData['barangay'] = 'FSUU Main Campus';
                $insertData['street'] = 'San Jose St.';
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

    public function ongoing(VenueBooking $booking, User $actor): VenueBooking
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

            $this->auditLog->log($actor, 'booking_ongoing', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function postInspection(VenueBooking $booking, User $actor): VenueBooking
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

            $this->auditLog->log($actor, 'booking_post_inspection', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function complete(VenueBooking $booking, User $actor, array $data = []): VenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $data) {
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
            $rawDate = $booking->reservation_end_date ?? $booking->date_of_usage ?? $booking->start_datetime;
            if ($rawDate instanceof \Carbon\CarbonInterface) {
                $scheduledEndDate = $rawDate->toDateString();
            } else if (is_string($rawDate)) {
                $scheduledEndDate = substr($rawDate, 0, 10);
            } else {
                $scheduledEndDate = \Carbon\Carbon::today()->toDateString();
            }

            $rawTime = $booking->time_end ?? $booking->end_datetime ?? '17:00:00';
            if ($rawTime instanceof \Carbon\CarbonInterface) {
                $scheduledEndTime = $rawTime->toTimeString();
            } else if (is_string($rawTime) && strlen($rawTime) > 8 && str_contains($rawTime, ' ')) {
                $scheduledEndTime = substr($rawTime, 11, 8);
            } else {
                $scheduledEndTime = is_string($rawTime) ? substr($rawTime, 0, 8) : '17:00:00';
            }
            $scheduledEndStr = $scheduledEndDate . ' ' . $scheduledEndTime;

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
                    ->where(function($q) use ($booking) {
                        $q->where('inspectable_id', $booking->id);
                        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'reference_id')) {
                            $q->orWhere('reference_id', $booking->id);
                        }
                    })
                    ->where(function($q) {
                        $q->where('inspectable_type', \App\Models\VenueBooking::class)
                          ->orWhere('inspectable_type', 'venue_booking')
                          ->orWhere('reference_type', 'venue_booking');
                    })
                    ->first();

                $condition = ($newStatus === 'damaged' || !empty($data['has_damage'])) ? 'damaged' : ($data['condition'] ?? 'good');
                $photo = $data['evidence_photo'] ?? $data['evidence_image'] ?? null;
                $violationType = $data['violation_type'] ?? ($isLate ? 'Late Return / Extension' : ($condition === 'damaged' ? 'Physical Facility / Furniture Damage' : null));
                $notes = $data['notes'] ?? $data['remarks'] ?? ($isLate ? "Completed {$minutesLate} minutes after scheduled end." : ($condition === 'damaged' ? 'Venue damage reported.' : 'Inspection completed on time.'));

                $inspData = [
                    'inspectable_type' => \App\Models\VenueBooking::class,
                    'inspectable_id'   => $booking->id,
                    'reference_type'   => 'venue_booking',
                    'reference_id'     => $booking->id,
                    'inspected_by'     => $actor->id ?? 1,
                    'inspection_type'  => 'post_event',
                    'condition'        => $condition,
                    'is_late'          => $isLate,
                    'timeliness'       => $timeliness,
                    'minutes_late'     => $minutesLate,
                    'notes'            => $notes,
                    'assigned_units'   => is_array($booking->assigned_units) ? json_encode($booking->assigned_units) : $booking->assigned_units,
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

            // Release assigned equipment units back to available
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
            if (!empty($barcodes)) {
                if ($newStatus === 'damaged' || !empty($data['has_damage'])) {
                    \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                        $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
                    })->update(['status' => 'unavailable', 'condition' => 'damaged']);
                } else {
                    \App\Models\EquipmentUnit::where(function($q) use ($barcodes) {
                        $q->whereIn('unit_code', $barcodes)->orWhereIn('name', $barcodes);
                    })->update(['status' => 'available', 'condition' => 'Good']);
                }
            }

            $this->auditLog->log($actor, 'booking_completed', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function undo(VenueBooking $booking, User $actor): VenueBooking
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

            $this->auditLog->log($actor, 'booking_undo', 'avr_venue_booking', $booking->id);

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

    private function assertAtLeastThreeDaysAhead(string $startDatetime): void
    {
        $hoursUntilStart = now()->diffInHours($startDatetime, false);

        if ($hoursUntilStart < 72) {
            throw new \App\Exceptions\VenueReservationTooSoonException();
        }
    }
}
