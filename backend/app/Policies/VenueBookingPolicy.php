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
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('venue_bookings', 'approve')
            || $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Approve);
    }

    public function reject(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('venue_bookings', 'reject')
            || $user->hasPermission(PermissionArea::VenueBooking, PermissionAction::Reject ?? 'reject');
    }

    public function ongoing(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('venue_bookings', 'set_ongoing') 
            || $user->hasPermission('venue_bookings', 'ongoing')
            || $user->hasPermission('venue_bookings');
    }

    public function postInspection(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('venue_bookings', 'post_inspection')
            || $user->hasPermission('venue_bookings');
    }

    public function complete(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('venue_bookings', 'complete')
            || $user->hasPermission('venue_bookings');
    }

    public function undo(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('venue_bookings', 'complete')
            || $user->hasPermission('venue_bookings');
    }

    public function cancel(User $user, VenueBooking $booking): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        if (! $user->hasPermission('venue_bookings', 'approve')) {
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
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('venue_bookings', 'assign_checkout')
            || $user->hasPermission('venue_bookings');
    }
}
