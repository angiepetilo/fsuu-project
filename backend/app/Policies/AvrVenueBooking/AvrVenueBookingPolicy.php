<?php

namespace App\Policies\AvrVenueBooking;

use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use App\Models\AvrVenueBooking;
use App\Models\User;

class AvrVenueBookingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, AvrVenueBooking $booking): bool
    {
        return $this->belongsToUsersOffice($user, $booking)
            || $this->userCanViewViaOversight($user, $booking);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, AvrVenueBooking $booking): bool
    {
        if ($user->isAdmin()) {
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

    public function reject(User $user, AvrVenueBooking $booking): bool
    {
        if ($user->isAdmin()) {
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

    public function cancel(User $user, AvrVenueBooking $booking): bool
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

    private function belongsToUsersOffice(User $user, AvrVenueBooking $booking): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $venueOfficeId = $booking->venue?->office_id ?? \App\Models\Venue::where('id', $booking->venue_id)->value('office_id');
        return (int)$user->office_id === (int)$venueOfficeId;
    }

    private function userCanViewViaOversight(User $user, AvrVenueBooking $booking): bool
    {
        $userOffice = $user->office;

        if (! $userOffice) {
            return false;
        }

        return $userOffice->can_view_office_id === $booking->venue->office_id;
    }
}