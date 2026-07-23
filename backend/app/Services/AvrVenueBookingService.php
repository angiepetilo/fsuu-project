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
            $this->assertAtLeastThreeDaysAhead($data['start_datetime']);

            $venue = Venue::where('id', $data['venue_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $hasOverlap = AvrVenueBooking::where('venue_id', $venue->id)
                ->whereIn('status', ['pending', 'approved'])
                ->where('start_datetime', '<', $data['end_datetime'])
                ->where('end_datetime', '>', $data['start_datetime'])
                ->lockForUpdate()
                ->exists();

            if ($hasOverlap) {
                throw new VenueOverlapException();
            }

            $referenceCode = $this->referenceCodeService->generate('VN');

            $booking = AvrVenueBooking::forceCreate([
                'reference_code'             => $referenceCode,
                'venue_id'                   => $venue->id,
                'requestor_name'             => $data['requestor_name'],
                'requestor_email'            => $data['requestor_email'],
                'requestor_contact_number'   => $data['requestor_contact_number'],
                'requestor_program_office'   => $data['requestor_program_office'],
                'requestor_identity_type'    => $data['requestor_identity_type'],
                'booking_classification'     => $data['booking_classification'],
                'purpose'                    => $data['purpose'],
                'number_of_persons'          => $data['number_of_persons'],
                'title_of_reservation'       => $data['title_of_reservation'],
                'event_type'                 => $data['event_type'],
                'equipment_notes'            => $data['equipment_notes'] ?? null,
                'contact_preference'         => $data['contact_preference'],
                'start_datetime'             => $data['start_datetime'],
                'end_datetime'               => $data['end_datetime'],
                'status'                     => 'pending',
                'submitted_by'               => $data['submitted_by'] ?? null,
            ]);

            // Dispatch confirmation email asynchronously
            SendBookingConfirmationJob::dispatch('venue', $booking->load('venue'));

            return $booking;
        });
    }

    public function approve(AvrVenueBooking $booking, User $actor, ?string $remarks = null): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $remarks) {
            $booking->forceFill(['status' => 'approved'])->save();

            Approval::forceCreate([
                'reference_type' => 'avr_venue_booking',
                'reference_id' => $booking->id,
                'action' => 'approved',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'booking_approved', 'avr_venue_booking', $booking->id);

            $notificationType = $booking->requestor_identity_type === 'external'
                ? 'payment_required'
                : 'venue_secured';

            $this->notification->log(
                'avr_venue_booking',
                $booking->id,
                $notificationType,
                $booking->contact_preference,
                $booking->contact_preference === 'email' ? $booking->requestor_email : $booking->requestor_contact_number
            );

            // Send status update email asynchronously
            SendBookingStatusUpdateJob::dispatch('venue', $booking->fresh('venue'), 'approved', $remarks);

            return $booking->fresh();
        });
    }

    public function reject(AvrVenueBooking $booking, User $actor, string $remarks): AvrVenueBooking
    {
        return DB::transaction(function () use ($booking, $actor, $remarks) {
            $booking->forceFill(['status' => 'rejected'])->save();

            Approval::forceCreate([
                'reference_type' => 'avr_venue_booking',
                'reference_id' => $booking->id,
                'action' => 'rejected',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'booking_rejected', 'avr_venue_booking', $booking->id);

            $this->notification->log(
                'avr_venue_booking',
                $booking->id,
                'booking_rejected',
                $booking->contact_preference,
                $booking->contact_preference === 'email' ? $booking->requestor_email : $booking->requestor_contact_number
            );

            // Send status update email asynchronously
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