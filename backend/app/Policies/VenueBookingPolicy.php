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
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin() || $user->isStaff() || $user->isAdmin() || $user->isGeneral()) {
            return true;
        }

        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
        }

        return false;
    }

    public function reject(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin() || $user->isStaff() || $user->isAdmin() || $user->isGeneral()) {
            return true;
        }

        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
        }

        return false;
    }

    public function ongoing(User $user, VenueBooking $booking): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function postInspection(User $user, VenueBooking $booking): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function complete(User $user, VenueBooking $booking): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function undo(User $user, VenueBooking $booking): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function cancel(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin() || $user->isGeneral()) {
            return true;
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
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }
}
