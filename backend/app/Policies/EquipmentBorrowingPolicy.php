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
        return $this->belongsToUsersOffice($user, $borrowing)
            || $this->userCanViewViaOversight($user, $borrowing);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, EquipmentBorrowing $borrowing): bool
    {
        return $this->belongsToUsersOffice($user, $borrowing)
            && $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function reject(User $user, EquipmentBorrowing $borrowing): bool
    {
        return $this->belongsToUsersOffice($user, $borrowing)
            && $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::Approve);
    }

    public function cancel(User $user, EquipmentBorrowing $borrowing): bool
    {
        if (! $this->belongsToUsersOffice($user, $borrowing)) {
            return false;
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

    /**
     * Staff can assign a physical unit to a borrowing item IF:
     *   - The borrowing belongs to their office, AND
     *   - They have the assign_checkout permission for equipment_borrowing area.
     */
    public function assignUnit(User $user, EquipmentBorrowing $borrowing): bool
    {
        return $this->belongsToUsersOffice($user, $borrowing)
            && $user->hasPermission(PermissionArea::EquipmentBorrowing, PermissionAction::AssignCheckout);
    }

    private function belongsToUsersOffice(User $user, EquipmentBorrowing $borrowing): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($borrowing->office_id && (int)$user->office_id === (int)$borrowing->office_id) {
            return true;
        }

        $firstItem = $borrowing->items->first();
        if ($firstItem && $firstItem->equipmentType) {
            return (int)$user->office_id === (int)$firstItem->equipmentType->office_id;
        }

        return false;
    }

    private function userCanViewViaOversight(User $user, EquipmentBorrowing $borrowing): bool
    {
        $userOffice = $user->office;

        if (! $userOffice) {
            return false;
        }

        $firstItem = $borrowing->items->first();
        if (! $firstItem || ! $firstItem->equipmentType) {
            return false;
        }

        return $userOffice->can_view_office_id === $firstItem->equipmentType->office_id;
    }
}
