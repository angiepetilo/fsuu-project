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
        ?User $staff,
        string $inspectionType,
        ?string $conditionNotes,
        bool $hasDamage = false,
        ?float $damageChargeAmount = null,
        array $extraData = []
    ): Inspection {
        $staffId = $staff ? $staff->id : (auth()->id() ?? 1);
        $inspectableClass = $referenceType === 'equipment_borrow' ? \App\Models\EquipmentBorrow::class : \App\Models\VenueBooking::class;

        $data = [
            'inspectable_type' => $inspectableClass,
            'inspectable_id'   => $referenceId,
            'reference_type'   => $referenceType,
            'reference_id'     => $referenceId,
            'inspected_by'     => $staffId,
            'inspection_type'  => $inspectionType,
            'condition'        => $extraData['condition'] ?? ($hasDamage ? 'damaged' : 'good'),
            'is_late'          => $extraData['is_late'] ?? false,
            'timeliness'       => $extraData['timeliness'] ?? 'on_time',
            'minutes_late'     => $extraData['minutes_late'] ?? 0,
            'violation_type'   => $extraData['violation_type'] ?? null,
            'notes'            => $conditionNotes ?? $extraData['notes'] ?? null,
            'evidence_photo'   => $extraData['evidence_photo'] ?? request('evidence_photo') ?? request('evidence_image'),
            'assigned_units'   => $extraData['assigned_units'] ?? request('assigned_units'),
            'unit_conditions'  => $extraData['unit_conditions'] ?? request('unit_conditions'),
            'inspected_at'     => now(),
            'created_at'       => now(),
            'updated_at'       => now(),
        ];

        // Update existing or create new inspection record
        $inspection = Inspection::where(function ($q) use ($referenceId) {
            $q->where('inspectable_id', $referenceId)
              ->orWhere('reference_id', $referenceId);
        })->where(function ($q) use ($inspectableClass, $referenceType) {
            $q->where('inspectable_type', $inspectableClass)
              ->orWhere('reference_type', $referenceType);
        })->first();

        if ($inspection) {
            $inspection->update($data);
        } else {
            $inspection = Inspection::forceCreate($data);
        }

        // Handle physical units status restoration/updates
        $this->syncPhysicalUnitsCondition($extraData);

        try {
            if ($staff) {
                $this->auditLog->log($staff, 'inspection_recorded', $referenceType, $referenceId, [
                    'inspection_id' => $inspection->id,
                    'condition'     => $data['condition'],
                    'timeliness'    => $data['timeliness'],
                    'notes'         => $conditionNotes,
                ]);
            }
        } catch (\Throwable $e) {}

        return $inspection;
    }

    /**
     * Synchronize physical equipment unit records with inspected condition
     */
    public function syncPhysicalUnitsCondition(array $data): void
    {
        $assigned = $data['assigned_units'] ?? [];
        if (is_string($assigned)) {
            $assigned = json_decode($assigned, true) ?? [];
        }

        $unitConditions = $data['unit_conditions'] ?? [];
        if (is_string($unitConditions)) {
            $unitConditions = json_decode($unitConditions, true) ?? [];
        }

        $overallCondition = strtolower($data['condition'] ?? 'good');
        $barcodes = array_filter(array_values($assigned));

        // Baseline batch update if no per-unit conditions
        if (!empty($barcodes) && empty($unitConditions)) {
            if ($overallCondition === 'good') {
                \App\Models\EquipmentUnit::where(function ($q) use ($barcodes) {
                    $q->whereIn('unit_code', $barcodes)->orWhereIn('id', $barcodes);
                })->update(['status' => 'available', 'condition' => 'Good']);
            } else {
                $status = $overallCondition === 'lost' ? 'lost' : 'damaged';
                $cond = $overallCondition === 'lost' ? 'Lost' : 'Damaged';
                \App\Models\EquipmentUnit::where(function ($q) use ($barcodes) {
                    $q->whereIn('unit_code', $barcodes)->orWhereIn('id', $barcodes);
                })->update(['status' => $status, 'condition' => $cond]);
            }
        }

        // Granular per-unit condition map
        if (is_array($unitConditions)) {
            foreach ($unitConditions as $key => $condVal) {
                $uBar = $assigned[$key] ?? (is_string($key) || is_numeric($key) ? (string)$key : null);
                $lookupKeys = array_filter(array_unique([$key, $uBar]));
                if (!empty($lookupKeys)) {
                    $rawCondition = is_array($condVal) ? ($condVal['condition'] ?? $condVal['status'] ?? 'Good') : (string)$condVal;
                    $condNormalized = ucfirst(strtolower(trim($rawCondition)));
                    $uStatus = ($condNormalized === 'Damaged' || $condNormalized === 'Lost') ? 'unavailable' : 'available';
                    $uCond = $condNormalized === 'Damaged' ? 'Damaged' : ($condNormalized === 'Lost' ? 'Lost' : 'Good');
                    \App\Models\EquipmentUnit::where(function ($q) use ($lookupKeys) {
                        $q->whereIn('unit_code', $lookupKeys)->orWhereIn('id', $lookupKeys);
                    })->update(['status' => $uStatus, 'condition' => $uCond]);
                }
            }
        }
    }
}