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
        ?float $damageChargeAmount = null
    ): Inspection {
        $staffId = $staff ? $staff->id : (auth()->id() ?? 1);
        $data = [
            'inspected_by'    => $staffId,
            'inspection_type' => $inspectionType,
            'notes'           => $conditionNotes,
            'created_at'       => now(),
            'updated_at'       => now(),
        ];

        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'reference_type')) {
            $data['reference_type'] = $referenceType;
            $data['reference_id']   = $referenceId;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'inspectable_type')) {
            $data['inspectable_type'] = 'App\\Models\\VenueBooking';
            $data['inspectable_id']   = $referenceId;
        }

        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'has_damage')) {
            $data['has_damage'] = $hasDamage;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'condition')) {
            $data['condition'] = $hasDamage ? 'damaged' : 'good';
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'condition_notes')) {
            $data['condition_notes'] = $conditionNotes;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'evidence_photo')) {
            $data['evidence_photo'] = request('evidence_photo') ?? request('evidence_image');
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('inspections', 'violation_type')) {
            $data['violation_type'] = request('violation_type');
        }

        $inspection = Inspection::forceCreate($data);

        try {
            if ($staff) {
                $this->auditLog->log($staff, 'inspection_recorded', 'avr_venue_booking', $referenceId, [
                    'inspection_id' => $inspection->id,
                    'has_damage'    => $hasDamage,
                    'notes'         => $conditionNotes,
                ]);
            }
        } catch (\Throwable $e) {}

        return $inspection;
    }
}