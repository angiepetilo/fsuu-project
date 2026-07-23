<?php

namespace App\Enums;

/**
 * Physical status of a single equipment unit (equipment_units.unit_status).
 *
 * Lifecycle rules:
 *   - 'lost' is terminal. No path back to Available.
 *   - 'damaged' -> 'under_repair' -> 'available' is the repair cycle.
 *   - Availability counts for borrowing requests must query unit_status = 'available',
 *     NOT the old is_available boolean.
 *
 * Do NOT conflate with equipment_borrowings.status (the borrowing request lifecycle).
 * These are two separate lifecycles on two separate records.
 */
enum UnitStatus: string
{
    case Available   = 'available';
    case CheckedOut  = 'checked_out';
    case Damaged     = 'damaged';
    case UnderRepair = 'under_repair';
    case Lost        = 'lost';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Terminal statuses — unit cannot return to service. */
    public static function terminal(): array
    {
        return [self::Lost->value];
    }

    /** Statuses that remove the unit from availability counts. */
    public static function unavailable(): array
    {
        return [
            self::CheckedOut->value,
            self::Damaged->value,
            self::UnderRepair->value,
            self::Lost->value,
        ];
    }
}
