<?php

namespace App\Policies;

use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use App\Models\EquipmentBorrowing;
use App\Models\User;

class EquipmentBorrowingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, EquipmentBorrowing $borrowing): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, EquipmentBorrowing $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        return $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function reject(User $user, EquipmentBorrowing $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        return $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function cancel(User $user, EquipmentBorrowing $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        if (! $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve)) {
            return false;
        }

        $isWithinFinalWindow = now()->diffInHours($borrowing->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $user->isStaff()) {
            return false;
        }

        return true;
    }

    public function assignUnit(User $user, EquipmentBorrowing $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        return $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::AssignCheckout);
    }
}
