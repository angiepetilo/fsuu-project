<?php

namespace App\Enums;

/**
 * Valid areas a Staff member can be granted a permission in.
 * Assigned by the office's Admin via staff_permissions table.
 *
 * Hard rule from architecture doc (enforced in Service/Policy, not here):
 *   - Staff can NEVER edit a venue booking once it has reached 'approved' status,
 *     regardless of any granted permission.
 */
enum PermissionArea: string
{
    case EquipmentManagement = 'equipment_management';
    case VenueManagement     = 'venue_management';
    case EquipmentBorrowing  = 'equipment_borrowing';
    case VenueBooking        = 'venue_booking';
    case Inventory           = 'inventory';
    case Reports             = 'reports';

    /**
     * Returns all valid area string values — use this in Form Request validation
     * instead of hardcoding strings.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
