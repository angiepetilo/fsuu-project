<?php

namespace App\Services;

use App\Exceptions\BookingActionNotAllowedException;
use App\Exceptions\EquipmentUnavailableException;
use App\Exceptions\ExternalRequiresVenueBookingException;
use App\Jobs\SendBookingConfirmationJob;
use App\Jobs\SendBookingStatusUpdateJob;
use App\Models\Approval;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentBorrowItem as EquipmentBorrowingItem;
use App\Models\EquipmentType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EquipmentBorrowingService
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

            foreach ($data['items'] ?? [] as $item) {
                $this->assertQuantityAvailable(
                    $item['equipment_type_id'],
                    $item['quantity_requested'] ?? 1,
                    $data['start_datetime'],
                    $data['end_datetime']
                );
            }

            $referenceCode = $this->referenceCodeService->generate('EQ');

            $trackingId = null;
            try {
                $trackingId = DB::table('tracking_numbers')->insertGetId([
                    'reference_code'   => $referenceCode,
                    'reservation_type' => 'equipment_borrowing',
                    'reservation_id'   => 0,
                    'status'           => 'pending',
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            } catch (\Throwable $e) {}

            $hasCol = fn ($col) => \Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', $col);

            $insertData = [
                'tracking_number_id' => $trackingId,
                'purpose'            => $data['purpose'] ?? 'General Activity',
                'place_of_use'       => $data['place_of_use'] ?? 'inside',
                'submitted_by'       => $data['submitted_by'] ?? null,
            ];
            if ($hasCol('submission_channel')) {
                $insertData['submission_channel'] = $data['submission_channel'] ?? 'online_self';
            }
            if ($hasCol('status')) $insertData['status'] = 'pending';
            if ($hasCol('academic_term_id')) {
                $activeTermId = null;
                if (\Illuminate\Support\Facades\Schema::hasTable('academic_terms')) {
                    $activeTermId = \Illuminate\Support\Facades\DB::table('academic_terms')
                        ->where('is_active', true)
                        ->value('id')
                        ?: \Illuminate\Support\Facades\DB::table('academic_terms')->value('id');
                }
                $insertData['academic_term_id'] = $activeTermId ?: null;
            }

            $name = $data['requestor_name'] ?? $data['filer_name'] ?? 'Filer';
            if ($hasCol('requestor_name')) $insertData['requestor_name'] = $name;
            if ($hasCol('filer_name')) $insertData['filer_name'] = $name;

            $email = $data['requestor_email'] ?? $data['email_address'] ?? 'requestor@urios.edu.ph';
            if ($hasCol('requestor_email')) $insertData['requestor_email'] = $email;
            if ($hasCol('email_address')) $insertData['email_address'] = $email;

            $contact = $data['requestor_contact_number'] ?? $data['contact_number'] ?? '09123456789';
            if ($hasCol('requestor_contact_number')) $insertData['requestor_contact_number'] = $contact;
            if ($hasCol('contact_number')) $insertData['contact_number'] = $contact;

            $officeDept = $data['requestor_program_office'] ?? $data['program_office'] ?? 'Department';
            if ($hasCol('requestor_program_office')) $insertData['requestor_program_office'] = $officeDept;
            if ($hasCol('program_office')) $insertData['program_office'] = $officeDept;

            $identity = $data['requestor_identity_type'] ?? $data['classification'] ?? 'student';
            if ($hasCol('requestor_identity_type')) $insertData['requestor_identity_type'] = $identity;
            if ($hasCol('classification')) $insertData['classification'] = $identity;

            if ($hasCol('start_datetime')) $insertData['start_datetime'] = $data['start_datetime'];
            if ($hasCol('end_datetime')) $insertData['end_datetime'] = $data['end_datetime'];
            if ($hasCol('date_of_usage')) $insertData['date_of_usage'] = substr($data['start_datetime'], 0, 10);
            if ($hasCol('time_start')) $insertData['time_start'] = substr($data['start_datetime'], 11, 8);
            if ($hasCol('time_end')) $insertData['time_end'] = substr($data['end_datetime'], 11, 8);
            if ($hasCol('used_inside_campus')) $insertData['used_inside_campus'] = $data['used_inside_campus'] ?? true;
            if ($hasCol('contact_preference')) $insertData['contact_preference'] = $data['contact_preference'] ?? 'email';
            if ($hasCol('reference_code')) $insertData['reference_code'] = $referenceCode;
            if ($hasCol('school_id') && isset($data['school_id'])) {
                $insertData['school_id'] = $data['school_id'];
            }
            if ($hasCol('assigned_units') && isset($data['assigned_units'])) {
                $insertData['assigned_units'] = is_array($data['assigned_units']) ? json_encode($data['assigned_units']) : $data['assigned_units'];
            }
            if (isset($data['avr_venue_booking_id']) && $hasCol('avr_venue_booking_id')) {
                $insertData['avr_venue_booking_id'] = $data['avr_venue_booking_id'];
            }
            if (!empty($data['endorsement_url'])) {
                if ($hasCol('endorsement_url')) $insertData['endorsement_url'] = $data['endorsement_url'];
                if ($hasCol('endorsement_letter')) $insertData['endorsement_letter'] = $data['endorsement_url'];
                if ($hasCol('endorsement_file')) $insertData['endorsement_file'] = $data['endorsement_url'];
                if ($hasCol('file_path')) $insertData['file_path'] = $data['endorsement_url'];
                if ($hasCol('attachment')) $insertData['attachment'] = $data['endorsement_url'];
            }

            $borrowing = EquipmentBorrowing::forceCreate($insertData);

            if ($trackingId) {
                DB::table('tracking_numbers')->where('id', $trackingId)->update(['reservation_id' => $borrowing->id]);
            }

            if (!empty($data['endorsement_url']) && \Illuminate\Support\Facades\Schema::hasTable('documents')) {
                try {
                    DB::table('documents')->insert([
                        'reservation_type' => 'equipment_borrowing',
                        'reservation_id'   => $borrowing->id,
                        'file_path'        => $data['endorsement_url'],
                        'document_type'    => 'endorsement_letter',
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);
                } catch (\Throwable $e) {}
            }

            foreach ($data['items'] ?? [] as $item) {
                $itemInsert = [
                    'equipment_type_id' => $item['equipment_type_id'],
                    'quantity_requested' => $item['quantity_requested'] ?? 1,
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrow_items', 'equipment_borrowing_id')) {
                    $itemInsert['equipment_borrowing_id'] = $borrowing->id;
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrow_items', 'equipment_borrow_id')) {
                    $itemInsert['equipment_borrow_id'] = $borrowing->id;
                }
                EquipmentBorrowingItem::create($itemInsert);
            }

            // Dispatch confirmation email asynchronously
            try {
                SendBookingConfirmationJob::dispatch('equipment', $borrowing->load('items'));
            } catch (\Throwable $e) {}

            // Broadcast real-time Pusher event
            try {
                event(new \App\Events\BookingCreated(
                    'equipment_borrowing',
                    $referenceCode,
                    $data['filer_name'] ?? $data['requestor_name'] ?? 'Applicant',
                    $data['program_office'] ?? $data['requestor_program_office'] ?? 'Department',
                    $data['place_of_use'] ?? 'Campus Facility',
                    substr($data['start_datetime'] ?? date('Y-m-d'), 0, 10),
                    substr($data['start_datetime'] ?? '08:00', 11, 5),
                    substr($data['end_datetime'] ?? '12:00', 11, 5),
                    $borrowing->id
                ));
            } catch (\Throwable $e) {}

            return $borrowing->fresh(['items', 'trackingNumber']);
        });
    }

    public function approve(EquipmentBorrowing $borrowing, User $actor, ?string $remarks = null): EquipmentBorrowing
    {
        return DB::transaction(function () use ($borrowing, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                $borrowing->forceFill(['status' => 'approved'])->save();
            }
            if ($borrowing->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $borrowing->tracking_number_id)->update(['status' => 'approved']);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                Approval::forceCreate([
                    'reference_type' => 'equipment_borrowing',
                    'reference_id' => $borrowing->id,
                    'action' => 'approved',
                    'remarks' => $remarks,
                    'approved_by' => $actor->id,
                ]);
            }

            $this->auditLog->log($actor, 'borrowing_approved', 'equipment_borrowing', $borrowing->id);

            $channel = $borrowing->contact_preference ?: 'email';
            $recipient = ($channel === 'sms' && $borrowing->requestor_contact_number)
                ? $borrowing->requestor_contact_number
                : ($borrowing->requestor_email ?: 'requestor@fsuu.edu.ph');

            $this->notification->log(
                'equipment_borrowing',
                $borrowing->id,
                'equipment_ready_for_claim',
                $channel,
                $recipient
            );

            // Send status update email asynchronously
            SendBookingStatusUpdateJob::dispatch('equipment', $borrowing, 'approved', $remarks);

            // Broadcast real-time status update
            try {
                $ref = $borrowing->reference_code ?? $borrowing->trackingNumber?->reference_code ?? ('TRK-EB-' . $borrowing->id);
                event(new \App\Events\BookingStatusUpdated('equipment_borrowing', $ref, 'approved', $borrowing->id, $remarks));
            } catch (\Throwable $e) {}

            return $borrowing->fresh();
        });
    }

    public function reject(EquipmentBorrowing $borrowing, User $actor, string $remarks): EquipmentBorrowing
    {
        return DB::transaction(function () use ($borrowing, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                $borrowing->forceFill(['status' => 'rejected'])->save();
            }
            if ($borrowing->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $borrowing->tracking_number_id)->update(['status' => 'rejected']);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                Approval::forceCreate([
                    'reference_type' => 'equipment_borrowing',
                    'reference_id' => $borrowing->id,
                    'action' => 'rejected',
                    'remarks' => $remarks,
                    'approved_by' => $actor->id,
                ]);
            }

            $this->auditLog->log($actor, 'borrowing_rejected', 'equipment_borrowing', $borrowing->id);

            $channel = $borrowing->contact_preference ?: 'email';
            $recipient = ($channel === 'sms' && $borrowing->requestor_contact_number)
                ? $borrowing->requestor_contact_number
                : ($borrowing->requestor_email ?: 'requestor@fsuu.edu.ph');

            $this->notification->log(
                'equipment_borrowing',
                $borrowing->id,
                'borrowing_rejected',
                $channel,
                $recipient
            );

            // Dispatch status update email asynchronously
            SendBookingStatusUpdateJob::dispatch('equipment', $borrowing->fresh(), 'rejected', $remarks);

            return $borrowing->fresh();
        });
    }

    public function cancel(EquipmentBorrowing $borrowing, User $actor, ?string $remarks = null): EquipmentBorrowing
    {
        $this->assertCancelAllowed($borrowing, $actor);

        return DB::transaction(function () use ($borrowing, $actor, $remarks) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                $borrowing->forceFill(['status' => 'cancelled'])->save();
            }
            if ($borrowing->tracking_number_id) {
                DB::table('tracking_numbers')->where('id', $borrowing->tracking_number_id)->update(['status' => 'cancelled']);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('approvals')) {
                Approval::forceCreate([
                    'reference_type' => 'equipment_borrowing',
                    'reference_id' => $borrowing->id,
                    'action' => 'cancelled',
                    'remarks' => $remarks,
                    'approved_by' => $actor->id,
                ]);
            }

            $this->auditLog->log($actor, 'borrowing_cancelled', 'equipment_borrowing', $borrowing->id);

            $channel = $borrowing->contact_preference ?: 'email';
            $recipient = ($channel === 'sms' && $borrowing->requestor_contact_number)
                ? $borrowing->requestor_contact_number
                : ($borrowing->requestor_email ?: 'requestor@fsuu.edu.ph');

            $this->notification->log(
                'equipment_borrowing',
                $borrowing->id,
                'borrowing_cancelled',
                $channel,
                $recipient
            );

            // Dispatch status update email asynchronously
            SendBookingStatusUpdateJob::dispatch('equipment', $borrowing->fresh(), 'cancelled', $remarks);

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
        if (($data['requestor_identity_type'] ?? $data['classification'] ?? 'student') !== 'external') {
            return;
        }

        $venueBookingId = $data['avr_venue_booking_id'] ?? null;

        if ($venueBookingId && ! VenueBooking::where('id', $venueBookingId)->exists()) {
            throw new ExternalRequiresVenueBookingException('The specified venue booking does not exist.');
        }
    }

    private function assertQuantityAvailable(
        int $equipmentTypeId,
        int $requestedQuantity,
        string $startDatetime,
        string $endDatetime
    ): void {
        $type = EquipmentType::where('id', $equipmentTypeId)->lockForUpdate()->first();
        if (!$type) return;

        $totalStock = max(1, $type->total_quantity ?? 1);

        $dateStr = substr($startDatetime, 0, 10);
        $startTimeStr = substr($startDatetime, 11, 8);
        $endTimeStr = substr($endDatetime, 11, 8);

        // 1. Calculate Equipment Borrowings overlapping this time slot
        $borrowCommitted = \App\Models\EquipmentBorrowItem::where('equipment_type_id', $equipmentTypeId)
            ->whereHas('equipmentBorrow', function ($query) use ($dateStr, $startTimeStr, $endTimeStr) {
                $query->whereHas('trackingNumber', fn($t) => $t->whereNotIn('status', ['rejected', 'cancelled']))
                    ->where('date_of_usage', $dateStr)
                    ->where('time_start', '<', $endTimeStr)
                    ->where('time_end', '>', $startTimeStr);
            })
            ->sum('quantity_requested');

        // 2. Calculate Venue Bookings overlapping this date & time slot
        $venueCommitted = \App\Models\VenueBooking::whereHas('trackingNumber', fn($t) => $t->whereNotIn('status', ['rejected', 'cancelled']))
            ->where('date_of_usage', $dateStr)
            ->where('time_start', '<', $endTimeStr)
            ->where('time_end', '>', $startTimeStr)
            ->get()
            ->sum(function ($vb) use ($type) {
                $eqText = strtoupper($vb->equipment_needed ?? '');
                $typeName = strtoupper($type->name ?? $type->eq_name ?? '');
                if ($typeName && str_contains($eqText, $typeName)) {
                    preg_match('/\d+/', $eqText, $m);
                    return isset($m[0]) ? (int)$m[0] : 1;
                }
                return 0;
            });

        $totalCommitted = $borrowCommitted + $venueCommitted;
        $availableInSlot = max(0, $totalStock - $totalCommitted);

        if ($requestedQuantity > $availableInSlot) {
            throw new \App\Exceptions\EquipmentUnavailableException("Requested quantity ({$requestedQuantity}) exceeds available stock ({$availableInSlot}) for this time slot.");
        }
    }

    public function assignUnit(EquipmentBorrowingItem $item, string $barcode, User $actor): \App\Models\EquipmentBorrowingUnit
    {
        $unit = \App\Models\EquipmentUnit::where('barcode', $barcode)->firstOrFail();

        if ($unit->equipment_type_id !== $item->equipment_type_id) {
            throw new \App\Exceptions\BookingActionNotAllowedException('This unit does not match the requested equipment type.');
        }

        if (! $unit->isAvailableForBorrowing()) {
            throw new \App\Exceptions\EquipmentUnavailableException('This equipment unit is not available for borrowing.');
        }

        $borrowing = $item->equipmentBorrowing;

        // Check if unit is already assigned during this timeframe
        $isConflict = \App\Models\EquipmentBorrowingUnit::where('equipment_unit_id', $unit->id)
            ->whereHas('item.equipmentBorrowing', function ($query) use ($borrowing) {
                $query->whereIn('status', ['pending', 'approved'])
                    ->where('start_datetime', '<', $borrowing->end_datetime)
                    ->where('end_datetime', '>', $borrowing->start_datetime);
            })
            ->exists();

        if ($isConflict) {
            throw new \App\Exceptions\EquipmentUnavailableException('This unit is already assigned to another booking during this time.');
        }

        // Create the assignment
        $assignment = \App\Models\EquipmentBorrowingUnit::forceCreate([
            'equipment_borrowing_item_id' => $item->id,
            'equipment_unit_id' => $unit->id,
        ]);

        $this->auditLog->log($actor, 'equipment_unit_assigned', 'equipment_borrowing', $borrowing->id, [
            'item_id' => $item->id,
            'unit_id' => $unit->id,
            'barcode' => $barcode,
        ]);

        return $assignment;
    }

    public function override(EquipmentBorrowing $borrowing, User $actor, array $data): EquipmentBorrowing
    {
        return DB::transaction(function () use ($borrowing, $actor, $data) {
            $updateData = array_filter([
                'filer_name'      => $data['filer_name'] ?? $data['requestor_name'] ?? null,
                'email_address'   => $data['email_address'] ?? $data['requestor_email'] ?? null,
                'contact_number'  => $data['contact_number'] ?? $data['requestor_contact_number'] ?? null,
                'program_office'  => $data['program_office'] ?? $data['requestor_program_office'] ?? null,
                'purpose'         => $data['purpose'] ?? null,
                'place_of_use'    => $data['place_of_use'] ?? null,
                'date_of_usage'   => isset($data['date_of_usage']) ? date('Y-m-d', strtotime($data['date_of_usage'])) : null,
                'time_start'      => isset($data['time_start']) ? date('H:i:s', strtotime($data['time_start'])) : null,
                'time_end'        => isset($data['time_end']) ? date('H:i:s', strtotime($data['time_end'])) : null,
            ], fn($v) => !is_null($v));

            if (isset($data['start_datetime'])) {
                $updateData['date_of_usage'] = date('Y-m-d', strtotime($data['start_datetime']));
                $updateData['time_start']    = date('H:i:s', strtotime($data['start_datetime']));
            }
            if (isset($data['end_datetime'])) {
                $updateData['time_end'] = date('H:i:s', strtotime($data['end_datetime']));
            }

            $borrowing->update($updateData);

            if (isset($data['status'])) {
                $newStatus = strtolower($data['status']);
                if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                    $borrowing->forceFill(['status' => $newStatus])->save();
                }
                if ($borrowing->tracking_number_id) {
                    DB::table('tracking_numbers')->where('id', $borrowing->tracking_number_id)->update(['status' => $newStatus]);
                }
            }

            $this->auditLog->log($actor, 'borrowing_override', 'equipment_borrowing', $borrowing->id);

            return $borrowing->fresh(['items.equipmentType', 'trackingNumber']);
        });
    }
}
