<?php

namespace App\Policies;

use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use App\Models\EquipmentBorrow;
use App\Models\User;

class EquipmentBorrowingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, EquipmentBorrow $borrowing): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('equipment_borrowing', 'approve')
            || $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function reject(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('equipment_borrowing', 'reject')
            || $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Reject ?? 'reject');
    }

    public function ongoing(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('equipment_borrowing', 'assign_checkout')
            || $user->hasPermission('equipment_borrowing', 'ongoing')
            || $user->hasPermission('equipment_borrowing');
    }

    public function inspection(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('equipment_borrowing', 'process_return')
            || $user->hasPermission('equipment_borrowing', 'inspection')
            || $user->hasPermission('equipment_borrowing');
    }

    public function complete(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('equipment_borrowing', 'complete')
            || $user->hasPermission('equipment_borrowing');
    }

    public function undo(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('equipment_borrowing', 'complete')
            || $user->hasPermission('equipment_borrowing');
    }

    public function cancel(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        if (! $user->hasPermission('equipment_borrowing', 'approve')) {
            return false;
        }

        $isWithinFinalWindow = now()->diffInHours($borrowing->start_datetime, false) < 24;

        if ($isWithinFinalWindow && $user->isStaff()) {
            return false;
        }

        return true;
    }

    public function assignUnit(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin()) return true;
        return $user->hasPermission('equipment_borrowing', 'assign_checkout')
            || $user->hasPermission('equipment_borrowing');
    }
}
