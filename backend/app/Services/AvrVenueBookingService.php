<?php

namespace App\Services;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\VenueOverlapException;
use App\Jobs\SendBookingConfirmationJob;
use App\Jobs\SendBookingStatusUpdateJob;
use App\Models\Approval;
use App\Models\AvrVenueBooking;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;

class AvrVenueBookingService
{
    public function __construct(
        private ReferenceCodeService $referenceCodeService,
        private AuditLogService $auditLog,
        private NotificationService $notification
    ) {}

    public function create(array $data): AvrVenueBooking
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

            // Create venue_booking entry
            $insertData = [
                'tracking_number_id' => $trackingId,
                'venue_id'           => $venue->id,
                'submitted_by'       => $data['submitted_by'] ?? null,
                'submission_channel' => 'online_self',
                'filer_name'         => $filerName,
                'email_address'      => $email,
                'program_office'     => $office,
                'contact_number'     => $contact,
                'classification'     => $classif,
                'place_of_use'       => 'inside',
                'purpose'            => $purpose,
                'no_of_person'       => $persons,
                'date_of_usage'      => $dateOfUsage,
                'time_start'         => $timeStart,
                'time_end'           => $timeEnd,
                'school_id'          => $data['school_id'] ?? null,
                'agreed_to_policy'   => true,
                'created_at'         => now(),
                'updated_at'         => now(),
            ];

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'province')) {
                $insertData['province'] = 'Agusan del Norte';
                $insertData['city'] = 'Butuan City';
                $insertData['barangay'] = 'FSUU Main Campus';
                $insertData['street'] = 'San Jose St.';
            }

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'equipment_notes')) {
                $insertData['equipment_notes'] = $data['equipment_notes'] ?? null;
            }

            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'reference_code')) {
                $insertData['reference_code'] = $referenceCode;
            }

            $bookingId = DB::table('venue_bookings')->insertGetId($insertData);

            DB::table('tracking_numbers')->where('id', $trackingId)->update(['reservation_id' => $bookingId]);

            // Save requested built-in equipment into venue_booking_equipment table
            $equipNotes = $data['equipment_notes'] ?? '';
            if (!empty($equipNotes) && \Illuminate\Support\Facades\Schema::hasTable('venue_booking_equipment')) {
                $items = array_map('trim', explode(',', $equipNotes));
                foreach ($items as $itemStr) {
                    if (empty($itemStr)) continue;
                    $cleanName = trim(explode('(', $itemStr)[0]);
                    $eqType = DB::table('equipment_types')
                        ->where('eq_name', 'LIKE', "%{$cleanName}%")
                        ->orWhere('eq_type', 'LIKE', "%{$cleanName}%")
                        ->first();
                    DB::table('venue_booking_equipment')->insert([
                        'venue_booking_id'  => $bookingId,
                        'equipment_type_id' => $eqType ? $eqType->id : 1,
                        'others_specify'    => $itemStr,
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
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

            $booking = AvrVenueBooking::with('venue', 'trackingNumber', 'documents')->find($bookingId);

            // Dispatch email confirmation to requestor
            try {
                SendBookingConfirmationJob::dispatch('venue', $booking);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to dispatch venue booking confirmation email: ' . $e->getMessage());
            }

            return $booking;
        });
    }

    public function approve(AvrVenueBooking $booking, User $actor, ?string $remarks = null): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'approved'])->save();
            }

            if ($booking->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $booking->tracking_number_id)->update(['status' => 'approved']);
            }

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

    public function reject(AvrVenueBooking $booking, User $actor, string $remarks): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'rejected'])->save();
            }

            if ($booking->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $booking->tracking_number_id)->update(['status' => 'rejected']);
            }

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

    public function cancel(AvrVenueBooking $booking, User $actor, ?string $remarks = null): AvrVenueBooking
    {
        $this->assertCancelAllowed($booking, $actor);

        return DB::transaction(function () use ($booking, $actor, $remarks) {
            $booking->forceFill(['status' => 'cancelled'])->save();

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

    public function ongoing(AvrVenueBooking $booking, User $actor): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'on-going'])->save();
            }

            if ($booking->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $booking->tracking_number_id)->update(['status' => 'on-going']);
            }

            $this->auditLog->log($actor, 'booking_ongoing', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function complete(AvrVenueBooking $booking, User $actor, array $data = []): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $data) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'completed'])->save();
            }

            if ($booking->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $booking->tracking_number_id)->update(['status' => 'completed']);
            }

            // Log damage / inspection if specified
            if (!empty($data['has_damage']) || ($data['inspection_status'] ?? '') === 'damages') {
                if (\Illuminate\Support\Facades\Schema::hasTable('inspections')) {
                    DB::table('inspections')->insert([
                        'inspectable_type' => 'App\\Models\\VenueBooking',
                        'inspectable_id'   => $booking->id,
                        'inspected_by'     => $actor->id,
                        'inspection_type'  => 'post_event',
                        'condition'        => 'damaged',
                        'notes'            => $data['remarks'] ?? 'Venue damage / rule violation reported.',
                        'inspected_at'     => now(),
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);
                }
            }

            $this->auditLog->log($actor, 'booking_completed', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    public function undo(AvrVenueBooking $booking, User $actor): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                $booking->forceFill(['status' => 'approved'])->save();
            }

            if ($booking->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $booking->tracking_number_id)->update(['status' => 'approved']);
            }

            $this->auditLog->log($actor, 'booking_undo', 'avr_venue_booking', $booking->id);

            return $booking->fresh(['venue', 'trackingNumber', 'documents']);
        });
    }

    private function assertCancelAllowed(AvrVenueBooking $booking, User $actor): void
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