<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HistoryLogService
{
    /**
     * Fetch and format completed/archived venue booking history records
     */
    public function getVenueBookingsHistory(?int $officeId = null, bool $isSuperAdmin = true, ?int $academicTermId = null): Collection
    {
        $vbQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->leftJoin('inspections', function ($join) {
                $join->on('venue_bookings.id', '=', 'inspections.inspectable_id')
                     ->where('inspections.inspectable_type', 'App\\Models\\VenueBooking');
            })
            ->leftJoin('documents', function ($join) {
                $join->on('venue_bookings.id', '=', 'documents.venue_booking_id');
            })
            ->whereNull('venue_bookings.archived_at')
            ->where(function ($query) {
                $activeStatuses = ['pending', 'approved', 'ongoing', 'reserved'];
                $query->whereNotNull('tracking_numbers.status')
                      ->whereNotIn(DB::raw('LOWER(tracking_numbers.status)'), $activeStatuses);
            });

        if ($academicTermId) {
            $vbQuery->where('venue_bookings.academic_term_id', $academicTermId);
        }

        $vbQuery->select(
                'venue_bookings.id',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.email_address',
                'venue_bookings.date_of_usage',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'venue_bookings.purpose',
                'venue_bookings.classification',
                'venue_bookings.contact_number as contact_no',
                'venue_bookings.equipment_notes',
                'venues.name as venue_name',
                'tracking_numbers.reference_code',
                'tracking_numbers.status',
                'inspections.condition as inspection_condition',
                'inspections.notes as inspection_notes',
                'inspections.evidence_photo as evidence_photo',
                'inspections.violation_type as violation_type',
                'inspections.assigned_units as assigned_units',
                'inspections.unit_conditions as unit_conditions',
                'documents.file_path as endorsement_letter',
                'venue_bookings.created_at',
                'venue_bookings.updated_at'
            )
            ->orderByDesc('venue_bookings.created_at');

        return $vbQuery->get()
            ->unique('id')
            ->values()
            ->map(function ($b) {
                $item = (array) $b;
                $hasDamage = ($b->inspection_condition ?? '') === 'damaged' || strtolower($b->status ?? '') === 'damaged' || !empty($b->violation_type);
                $violationText = $b->violation_type ?? ($hasDamage ? ($b->inspection_notes ?? 'Rule Violation / Damage Reported') : null);

                $assignedUnits = $b->assigned_units ? (is_string($b->assigned_units) ? json_decode($b->assigned_units, true) : $b->assigned_units) : null;
                $unitConditions = $b->unit_conditions ? (is_string($b->unit_conditions) ? json_decode($b->unit_conditions, true) : $b->unit_conditions) : null;

                return array_merge($item, [
                    'record_type'        => 'venue',
                    'equipment_notes'    => $b->equipment_notes ?? '',
                    'has_damage'         => $hasDamage,
                    'has_violation'      => !empty($violationText),
                    'violation'          => $violationText,
                    'violation_type'     => $b->violation_type ?? ($hasDamage ? 'Policy Breach Identified' : null),
                    'evidence_photo'     => $b->evidence_photo ?? null,
                    'endorsement_letter' => $b->endorsement_letter ?? null,
                    'assigned_units'     => $assignedUnits,
                    'unit_conditions'    => $unitConditions,
                    'violations'         => !empty($violationText) ? 1 : 0,
                ]);
            });
    }

    /**
     * Fetch and format completed/archived equipment borrowing history records
     */
    public function getEquipmentBorrowingsHistory(?int $officeId = null, bool $isSuperAdmin = true, ?int $academicTermId = null): Collection
    {
        $ebQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('inspections', function ($join) {
                $join->on('equipment_borrows.id', '=', 'inspections.inspectable_id')
                     ->where('inspections.inspectable_type', 'App\\Models\\EquipmentBorrow');
            })
            ->whereNull('equipment_borrows.archived_at')
            ->where(function ($query) {
                $activeStatuses = ['pending', 'approved', 'ongoing', 'reserved'];
                $query->whereNotNull('tracking_numbers.status')
                      ->whereNotIn(DB::raw('LOWER(tracking_numbers.status)'), $activeStatuses);
            });

        if ($academicTermId) {
            $ebQuery->where('equipment_borrows.academic_term_id', $academicTermId);
        }

        $ebQuery->select(
                'equipment_borrows.id',
                'equipment_borrows.filer_name',
                'equipment_borrows.program_office',
                'equipment_borrows.email_address',
                'equipment_borrows.date_of_usage',
                'equipment_borrows.time_start',
                'equipment_borrows.time_end',
                'equipment_borrows.purpose',
                'equipment_borrows.contact_number as contact_no',
                'tracking_numbers.reference_code',
                'tracking_numbers.status',
                'inspections.condition as inspection_condition',
                'inspections.notes as inspection_notes',
                'inspections.is_late as is_late',
                'inspections.timeliness as timeliness',
                'inspections.minutes_late as minutes_late',
                'inspections.violation_type as violation_type',
                'inspections.assigned_units as inspection_assigned_units',
                'inspections.unit_conditions as inspection_unit_conditions',
                'equipment_borrows.assigned_units as eb_assigned_units',
                'equipment_borrows.created_at',
                'equipment_borrows.updated_at'
            )
            ->orderByDesc('equipment_borrows.created_at');

        return $ebQuery->get()
            ->unique('id')
            ->values()
            ->map(function ($b) {
                $item = (array) $b;
                $isDamaged = ($b->inspection_condition ?? '') === 'damaged' || strtolower($b->status ?? '') === 'damaged';
                $isLost = ($b->inspection_condition ?? '') === 'lost' || strtolower($b->status ?? '') === 'lost';
                $isLate = !empty($b->is_late) || str_contains(strtolower($b->timeliness ?? ''), 'late') || str_contains(strtolower($b->violation_type ?? ''), 'overdue');
                $hasViolation = $isDamaged || $isLost || $isLate || !empty($b->violation_type);
                $violationText = $b->violation_type ?? ($hasViolation ? ($b->inspection_notes ?? 'Policy Breach / Inspection Outcome Recorded') : null);

                // Attach items
                $items = [];
                try {
                    if (Schema::hasTable('equipment_borrow_items')) {
                        $items = DB::table('equipment_borrow_items')
                            ->leftJoin('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
                            ->where('equipment_borrow_items.equipment_borrow_id', $b->id)
                            ->select('equipment_borrow_items.*', 'equipment_types.eq_name', 'equipment_types.eq_name as equipment_name')
                            ->get()
                            ->map(function ($it) {
                                return [
                                    'id'                 => $it->id,
                                    'equipment_type_id'  => $it->equipment_type_id,
                                    'quantity_requested' => $it->quantity_requested ?? 1,
                                    'equipment_name'     => $it->equipment_name ?? $it->eq_name ?? 'Equipment Item',
                                    'equipment_type'     => [
                                        'id'      => $it->equipment_type_id,
                                        'name'    => $it->equipment_name ?? $it->eq_name ?? 'Equipment Item',
                                        'eq_name' => $it->eq_name ?? $it->equipment_name ?? 'Equipment Item',
                                    ]
                                ];
                            })
                            ->toArray();
                    }
                } catch (\Throwable $th) {
                    $items = [];
                }

                $assignedRaw = $b->inspection_assigned_units ?? $b->eb_assigned_units ?? null;
                $assignedUnits = $assignedRaw ? (is_string($assignedRaw) ? json_decode($assignedRaw, true) : $assignedRaw) : null;
                $unitCondRaw = $b->inspection_unit_conditions ?? null;
                $unitConditions = $unitCondRaw ? (is_string($unitCondRaw) ? json_decode($unitCondRaw, true) : $unitCondRaw) : null;

                return array_merge($item, [
                    'record_type'     => 'equipment',
                    'items'           => $items,
                    'equipment_name'  => !empty($items) ? ($items[0]['equipment_name'] ?? 'Equipment') : 'Equipment Item',
                    'quantity'        => !empty($items) ? ($items[0]['quantity_requested'] ?? 1) : 1,
                    'has_damage'      => $isDamaged,
                    'is_lost'         => $isLost,
                    'is_late'         => $isLate,
                    'has_violation'   => $hasViolation,
                    'violation'       => $violationText,
                    'violation_type'  => $b->violation_type ?? ($isDamaged ? 'Physical Damage' : ($isLost ? 'Lost Property' : ($isLate ? 'Late Return' : null))),
                    'assigned_units'  => $assignedUnits,
                    'unit_conditions' => $unitConditions,
                    'violations'      => $hasViolation ? 1 : 0,
                ]);
            });
    }
}
