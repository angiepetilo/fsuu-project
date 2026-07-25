<?php

namespace App\Services;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\StudioReservationTooSoonException;
use App\Exceptions\VenueOverlapException;
use App\Models\Approval;
use App\Models\ScoStudioReservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;

class ScoStudioReservationService
{
    public function __construct(
        private ReferenceCodeService $referenceCodeService,
        private AuditLogService $auditLog,
        private NotificationService $notification
    ) {}

    public function create(array $data): ScoStudioReservation
    {
        return DB::transaction(function () use ($data) {
            $this->assertAtLeastThreeDaysAhead($data['start_datetime']);

            $venue = Venue::where('id', $data['venue_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $hasOverlap = ScoStudioReservation::where('venue_id', $venue->id)
                ->whereIn('status', ['pending', 'approved'])
                ->where('start_datetime', '<', $data['end_datetime'])
                ->where('end_datetime', '>', $data['start_datetime'])
                ->lockForUpdate()
                ->exists();

            if ($hasOverlap) {
                throw new VenueOverlapException();
            }

            $referenceCode = $this->referenceCodeService->generate('ST');

            return ScoStudioReservation::forceCreate([
                'reference_code' => $referenceCode,
                'venue_id' => $venue->id,
                'requestor_name' => $data['requestor_name'],
                'requestor_email' => $data['requestor_email'],
                'requestor_contact_number' => $data['requestor_contact_number'],
                'requestor_program_office' => $data['requestor_program_office'],
                'requestor_identity_type' => $data['requestor_identity_type'],
                'booking_classification' => $data['booking_classification'],
                'purpose' => $data['purpose'],
                'number_of_persons' => $data['number_of_persons'],
                'title_of_reservation' => $data['title_of_reservation'],
                'event_type' => $data['event_type'],
                'contact_preference' => $data['contact_preference'],
                'start_datetime' => $data['start_datetime'],
                'end_datetime' => $data['end_datetime'],
                'status' => 'pending',
                'submitted_by' => $data['submitted_by'] ?? null,
            ]);
        });
    }

    public function approve(ScoStudioReservation $reservation, User $actor, ?string $remarks = null): ScoStudioReservation
    {
        return DB::transaction(function () use ($reservation, $actor, $remarks) {
            $reservation->forceFill(['status' => 'approved'])->save();

            Approval::forceCreate([
                'reference_type' => 'sco_studio_reservation',
                'reference_id' => $reservation->id,
                'action' => 'approved',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'reservation_approved', 'sco_studio_reservation', $reservation->id);

            $notificationType = $reservation->requestor_identity_type === 'external'
                ? 'payment_required'
                : 'venue_secured';

            $this->notification->log(
                'sco_studio_reservation',
                $reservation->id,
                $notificationType,
                $reservation->contact_preference,
                $reservation->contact_preference === 'email' ? $reservation->requestor_email : $reservation->requestor_contact_number
            );

            return $reservation->fresh();
        });
    }

    public function reject(ScoStudioReservation $reservation, User $actor, string $remarks): ScoStudioReservation
    {
        return DB::transaction(function () use ($reservation, $actor, $remarks) {
            $reservation->forceFill(['status' => 'rejected'])->save();

            Approval::forceCreate([
                'reference_type' => 'sco_studio_reservation',
                'reference_id' => $reservation->id,
                'action' => 'rejected',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'reservation_rejected', 'sco_studio_reservation', $reservation->id);

            $this->notification->log(
                'sco_studio_reservation',
                $reservation->id,
                'reservation_rejected',
                $reservation->contact_preference,
                $reservation->contact_preference === 'email' ? $reservation->requestor_email : $reservation->requestor_contact_number
            );

            return $reservation->fresh();
        });
    }

    public function cancel(ScoStudioReservation $reservation, User $actor, ?string $remarks = null): ScoStudioReservation
    {
        $this->assertCancelAllowed($reservation, $actor);

        return DB::transaction(function () use ($reservation, $actor, $remarks) {
            $reservation->forceFill(['status' => 'cancelled'])->save();

            Approval::forceCreate([
                'reference_type' => 'sco_studio_reservation',
                'reference_id' => $reservation->id,
                'action' => 'cancelled',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'reservation_cancelled', 'sco_studio_reservation', $reservation->id);

            $this->notification->log(
                'sco_studio_reservation',
                $reservation->id,
                'reservation_cancelled',
                $reservation->contact_preference,
                $reservation->contact_preference === 'email' ? $reservation->requestor_email : $reservation->requestor_contact_number
            );

            return $reservation->fresh();
        });
    }

    private function assertCancelAllowed(ScoStudioReservation $reservation, User $actor): void
    {
        $isWithinFinalWindow = now()->diffInHours($reservation->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $actor->isStaff()) {
            throw new BookingActionNotAllowedException(
                'Staff can no longer cancel this reservation within 24 hours of the event. Only Head or Admin can proceed.'
            );
        }
    }

    private function assertAtLeastThreeDaysAhead(string $startDatetime): void
    {
        $today = now()->timezone('Asia/Manila')->startOfDay();
        $startDate = \Carbon\Carbon::parse($startDatetime, 'Asia/Manila')->startOfDay();

        $daysUntilStart = $today->diffInDays($startDate, false);

        if ($daysUntilStart < 3) {
            throw new StudioReservationTooSoonException();
        }
    }
}