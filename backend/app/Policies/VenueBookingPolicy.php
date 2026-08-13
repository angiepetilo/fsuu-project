<?php

namespace App\Policies;

use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use App\Models\VenueBooking;
use App\Models\User;

class VenueBookingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, VenueBooking $booking): bool
    {
        return $this->belongsToUsersOffice($user, $booking)
            || $this->userCanViewViaOversight($user, $booking);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$this->belongsToUsersOffice($user, $booking)) {
            return false;
        }

        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
        }

        return true;
    }

    public function reject(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$this->belongsToUsersOffice($user, $booking)) {
            return false;
        }

        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
        }

        return true;
    }

    public function cancel(User $user, VenueBooking $booking): bool
    {
        if (! $this->belongsToUsersOffice($user, $booking)) {
            return false;
        }

        if (! $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve)) {
            return false;
        }

        $isWithinFinalWindow = now()->diffInHours($booking->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $user->isStaff()) {
            return false;
        }

        return true;
    }

    public function assignUnit(User $user, VenueBooking $booking): bool
    {
        return $this->belongsToUsersOffice($user, $booking);
    }

    private function belongsToUsersOffice(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $venueOfficeId = $booking->venue?->office_id ?? \App\Models\Venue::where('id', $booking->venue_id)->value('office_id');
        return (int)$user->office_id === (int)$venueOfficeId;
    }

    private function userCanViewViaOversight(User $user, VenueBooking $booking): bool
    {
        $userOffice = $user->office;

        if (! $userOffice) {
            return false;
        }

        return $userOffice->can_view_office_id === $booking->venue->office_id;
    }
}
