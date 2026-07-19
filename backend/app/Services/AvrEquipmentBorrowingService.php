<?php

namespace App\Services;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Models\Approval;
use App\Models\AvrVenueBooking;
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentBorrowingItem;
use App\Models\EquipmentType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AvrEquipmentBorrowingService
{
    public function __construct(
        private ReferenceCodeService $referenceCodeService,
        private AuditLogService $auditLog,
        private NotificationService $notification
    ) {}

    public function create(array $data): EquipmentBorrowing
    {
        return DB::transaction(function () use ($data) {
            $this->assertExternalHasVenueBooking($data);

            foreach ($data['items'] as $item) {
                $this->assertQuantityAvailable(
                    $item['equipment_type_id'],
                    $item['quantity_requested'],
                    $data['start_datetime'],
                    $data['end_datetime']
                );
            }

            $referenceCode = $this->referenceCodeService->generate('EQ');

            $borrowing = EquipmentBorrowing::forceCreate([
                'reference_code' => $referenceCode,
                'avr_venue_booking_id' => $data['avr_venue_booking_id'] ?? null,
                'requestor_name' => $data['requestor_name'],
                'requestor_email' => $data['requestor_email'],
                'requestor_contact_number' => $data['requestor_contact_number'],
                'requestor_program_office' => $data['requestor_program_office'],
                'requestor_identity_type' => $data['requestor_identity_type'],
                'purpose' => $data['purpose'],
                'place_of_use' => $data['place_of_use'],
                'used_inside_campus' => $data['used_inside_campus'],
                'contact_preference' => $data['contact_preference'],
                'start_datetime' => $data['start_datetime'],
                'end_datetime' => $data['end_datetime'],
                'status' => 'pending',
                'submitted_by' => $data['submitted_by'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                EquipmentBorrowingItem::create([
                    'equipment_borrowing_id' => $borrowing->id,
                    'equipment_type_id' => $item['equipment_type_id'],
                    'quantity_requested' => $item['quantity_requested'],
                ]);
            }

            return $borrowing->fresh('items');
        });
    }

    public function approve(EquipmentBorrowing $borrowing, User $actor, ?string $remarks = null): EquipmentBorrowing
    {
        return DB::transaction(function () use ($borrowing, $actor, $remarks) {
            $borrowing->forceFill(['status' => 'approved'])->save();

            Approval::forceCreate([
                'reference_type' => 'equipment_borrowing',
                'reference_id' => $borrowing->id,
                'action' => 'approved',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'borrowing_approved', 'equipment_borrowing', $borrowing->id);

            $this->notification->log(
                'equipment_borrowing',
                $borrowing->id,
                'equipment_ready_for_claim',
                $borrowing->contact_preference,
                $borrowing->contact_preference === 'email' ? $borrowing->requestor_email : $borrowing->requestor_contact_number
            );

            return $borrowing->fresh();
        });
    }

    public function reject(EquipmentBorrowing $borrowing, User $actor, string $remarks): EquipmentBorrowing
    {
        return DB::transaction(function () use ($borrowing, $actor, $remarks) {
            $borrowing->forceFill(['status' => 'rejected'])->save();

            Approval::forceCreate([
                'reference_type' => 'equipment_borrowing',
                'reference_id' => $borrowing->id,
                'action' => 'rejected',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'borrowing_rejected', 'equipment_borrowing', $borrowing->id);

            $this->notification->log(
                'equipment_borrowing',
                $borrowing->id,
                'borrowing_rejected',
                $borrowing->contact_preference,
                $borrowing->contact_preference === 'email' ? $borrowing->requestor_email : $borrowing->requestor_contact_number
            );

            return $borrowing->fresh();
        });
    }

    public function cancel(EquipmentBorrowing $borrowing, User $actor, ?string $remarks = null): EquipmentBorrowing
    {
        $this->assertCancelAllowed($borrowing, $actor);

        return DB::transaction(function () use ($borrowing, $actor, $remarks) {
            $borrowing->forceFill(['status' => 'cancelled'])->save();

            Approval::forceCreate([
                'reference_type' => 'equipment_borrowing',
                'reference_id' => $borrowing->id,
                'action' => 'cancelled',
                'remarks' => $remarks,
                'approved_by' => $actor->id,
            ]);

            $this->auditLog->log($actor, 'borrowing_cancelled', 'equipment_borrowing', $borrowing->id);

            $this->notification->log(
                'equipment_borrowing',
                $borrowing->id,
                'borrowing_cancelled',
                $borrowing->contact_preference,
                $borrowing->contact_preference === 'email' ? $borrowing->requestor_email : $borrowing->requestor_contact_number
            );

            return $borrowing->fresh();
        });
    }

    private function assertCancelAllowed(EquipmentBorrowing $borrowing, User $actor): void
    {
        $isWithinFinalWindow = now()->diffInHours($borrowing->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $actor->isStaff()) {
            throw new BookingActionNotAllowedException(
                'Staff can no longer cancel this borrowing within 24 hours of the start time. Only Head or Admin can proceed.'
            );
        }
    }

    private function assertExternalHasVenueBooking(array $data): void
    {
        if ($data['requestor_identity_type'] !== 'external') {
            return;
        }

        $venueBookingId = $data['avr_venue_booking_id'] ?? null;

        if (! $venueBookingId || ! AvrVenueBooking::where('id', $venueBookingId)->exists()) {
            throw new ExternalRequiresVenueBookingException();
        }
    }

    private function assertQuantityAvailable(
        int $equipmentTypeId,
        int $requestedQuantity,
        string $startDatetime,
        string $endDatetime
    ): void {
        $type = EquipmentType::where('id', $equipmentTypeId)
            ->lockForUpdate()
            ->firstOrFail();

        $alreadyCommitted = EquipmentBorrowingItem::where('equipment_type_id', $equipmentTypeId)
            ->whereHas('equipmentBorrowing', function ($query) use ($startDatetime, $endDatetime) {
                $query->whereIn('status', ['pending', 'approved'])
                    ->where('start_datetime', '<', $endDatetime)
                    ->where('end_datetime', '>', $startDatetime);
            })
            ->sum('quantity_requested');

        if (($alreadyCommitted + $requestedQuantity) > $type->total_quantity) {
            throw new EquipmentUnavailableException();
        }
    }
}