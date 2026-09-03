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
        if ($user->isSuperAdmin() || $user->isStaff() || $user->isAdmin() || $user->isGeneral()) {
            return true;
        }

        return $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function reject(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isStaff() || $user->isAdmin() || $user->isGeneral()) {
            return true;
        }

        return $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function ongoing(User $user, EquipmentBorrow $borrowing): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function complete(User $user, EquipmentBorrow $borrowing): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function undo(User $user, EquipmentBorrow $borrowing): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }

    public function cancel(User $user, EquipmentBorrow $borrowing): bool
    {
        if ($user->isSuperAdmin() || $user->isAdmin() || $user->isGeneral()) {
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

    public function assignUnit(User $user, EquipmentBorrow $borrowing): bool
    {
        return $user->isSuperAdmin() || $user->isStaff() || $user->isStudentAssistant() || $user->isAdmin() || $user->isGeneral();
    }
}
