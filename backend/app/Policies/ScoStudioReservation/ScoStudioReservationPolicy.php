<?php

namespace App\Policies\ScoStudioReservation;

use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use App\Models\ScoStudioReservation;
use App\Models\User;

class ScoStudioReservationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ScoStudioReservation $reservation): bool
    {
        return $this->belongsToUsersOffice($user, $reservation)
            || $this->userCanViewViaOversight($user, $reservation);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, ScoStudioReservation $reservation): bool
    {
        return $this->belongsToUsersOffice($user, $reservation)
            && $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
    }

    public function reject(User $user, ScoStudioReservation $reservation): bool
    {
        return $this->belongsToUsersOffice($user, $reservation)
            && $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
    }

    public function cancel(User $user, ScoStudioReservation $reservation): bool
    {
        if (! $this->belongsToUsersOffice($user, $reservation)) {
            return false;
        }

        if (! $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve)) {
            return false;
        }

        $isWithinFinalWindow = now()->diffInHours($reservation->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $user->isStaff()) {
            return false;
        }

        return true;
    }

    private function belongsToUsersOffice(User $user, ScoStudioReservation $reservation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->office_id === $reservation->venue->office_id;
    }

    private function userCanViewViaOversight(User $user, ScoStudioReservation $reservation): bool
    {
        $userOffice = $user->office;

        if (! $userOffice) {
            return false;
        }

        return $userOffice->can_view_office_id === $reservation->venue->office_id;
    }
}
