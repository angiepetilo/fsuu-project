<?php

namespace App\Enums;

/**
 * Valid actions a Staff member can be granted within a given PermissionArea.
 * Assigned by the office's Admin via staff_permissions table.
 */
enum PermissionAction: string
{
    case Approve        = 'approve';
    case AssignCheckout = 'assign_checkout';
    case AddEdit        = 'add_edit';

    /**
     * Returns all valid action string values — use this in Form Request validation
     * instead of hardcoding strings.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
