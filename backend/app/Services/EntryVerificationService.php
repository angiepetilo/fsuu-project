<?php

namespace App\Services;

use App\Models\AvrVenueBooking;
use App\Models\EntryVerification;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class EntryVerificationService
{
    public function __construct(private AuditLogService $auditLog) {}

    public function record(
        AvrVenueBooking $booking,
        User $staff,
        string $contactMethodVerified,
        string $rawPin
    ): EntryVerification {
        $office = $booking->venue->office;

        if (! $office->checkPin($rawPin)) {
            throw new AuthorizationException('Invalid PIN.');
        }

        $verification = EntryVerification::forceCreate([
            'avr_venue_booking_id' => $booking->id,
            'verified_by' => $staff->id,
            'contact_method_verified' => $contactMethodVerified,
            'verified_at' => now(),
        ]);

        $this->auditLog->log($staff, 'entry_verified', 'avr_venue_booking', $booking->id);

        return $verification;
    }
}