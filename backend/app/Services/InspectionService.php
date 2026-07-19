<?php

namespace App\Services;

use App\Models\Inspection;
use App\Models\User;

class InspectionService
{
    public function __construct(private AuditLogService $auditLog) {}

    public function record(
        string $referenceType,
        int $referenceId,
        User $staff,
        string $inspectionType,
        ?string $conditionNotes,
        bool $hasDamage = false,
        ?float $damageChargeAmount = null
    ): Inspection {
        $inspection = Inspection::forceCreate([
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'inspected_by' => $staff->id,
            'inspection_type' => $inspectionType,
            'condition_notes' => $conditionNotes,
            'has_damage' => $hasDamage,
            'damage_charge_amount' => $damageChargeAmount,
        ]);

        $this->auditLog->log($staff, 'inspection_recorded', $referenceType, $referenceId, [
            'inspection_id' => $inspection->id,
            'has_damage' => $hasDamage,
        ]);

        return $inspection;
    }
}