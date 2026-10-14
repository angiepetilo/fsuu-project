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
            ->leftJoin('tracking_numbers', function ($join) {
                $join->on('venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                     ->orWhere(function ($q) {
                         $q->where('tracking_numbers.reservation_type', 'venue_booking')
                           ->whereColumn('tracking_numbers.reservation_id', 'venue_bookings.id');
                     });
            })
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->leftJoin('inspections', function ($join) {
                $join->on('venue_bookings.id', '=', 'inspections.inspectable_id')
                     ->where(function ($q) {
                         $q->where('inspections.inspectable_type', 'like', '%VenueBooking%')
                           ->orWhere('inspections.inspectable_type', 'avr_venue_booking')
                           ->orWhere('inspections.inspectable_type', 'venue_booking');
                     })
                     // Only pick the final post-event inspection (not pre_event) to avoid
                     // double-counting unit_conditions from both pre & post inspections
                     ->where(function ($q) {
                         $q->where('inspections.inspection_type', 'post_event')
                           ->orWhere('inspections.inspection_type', 'post_use')
                           ->orWhereNull('inspections.inspection_type');
                     });
            })
            ->leftJoin('documents', function ($join) {
                $join->on('venue_bookings.id', '=', 'documents.venue_booking_id');
            })
            ->whereNull('venue_bookings.archived_at')
            ->where(function ($query) {
                $activeStatuses = ['pending', 'approved', 'ongoing', 'on-going', 'post-inspection', 'reserved'];
                $query->where(function ($q) use ($activeStatuses) {
                    $q->whereNotNull('tracking_numbers.status')
                      ->whereNotIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), $activeStatuses);
                })->orWhere(function ($q) use ($activeStatuses) {
                    $q->whereNotNull('venue_bookings.status')
                      ->whereNotIn(DB::raw('LOWER(TRIM(venue_bookings.status))'), $activeStatuses);
                });
            });

        if ($academicTermId) {
            $vbQuery->where(function ($q) use ($academicTermId) {
                $q->where('venue_bookings.academic_term_id', $academicTermId)
                  ->orWhereNull('venue_bookings.academic_term_id');
            });
        }

        $vbQuery->select(
                'venue_bookings.id',
                'venue_bookings.first_name',
                'venue_bookings.middle_name',
                'venue_bookings.last_name',
                'venue_bookings.suffix',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.email_address',
                'venue_bookings.submission_channel',
                'venue_bookings.date_of_usage',
                'venue_bookings.reservation_end_date',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'venue_bookings.purpose',
                'venue_bookings.classification',
                'venue_bookings.contact_number as contact_no',
                'venue_bookings.equipment_types',
                'venue_bookings.equipment_units',
                'venue_bookings.equipment_notes',
                'venue_bookings.rejection_reason',
                'venue_bookings.is_auto_rejected',
                'venue_bookings.auto_reject_winning_reference',
                'venue_bookings.assigned_units as booking_assigned_units',
                'venue_bookings.endorsement_url',
                'venues.name as venue_name',
                'tracking_numbers.reference_code',
                DB::raw("COALESCE(tracking_numbers.status, venue_bookings.status) as status"),
                'inspections.condition as inspection_condition',
                'inspections.notes as inspection_notes',
                'inspections.evidence_photo as evidence_photo',
                'inspections.is_late as is_late',
                'inspections.timeliness as timeliness',
                'inspections.minutes_late as minutes_late',
                'inspections.violation_type as violation_type',
                'inspections.assigned_units as assigned_units',
                'inspections.unit_conditions as unit_conditions',
                'documents.file_path as endorsement_letter',
                'venue_bookings.created_at',
                'venue_bookings.updated_at'
            )
            // Order by inspections.id desc so the most recent inspection (post_event) takes priority
            // when unique('id') deduplicates venue_bookings rows
            ->orderByDesc('inspections.id')
            ->orderByDesc('venue_bookings.created_at');

        $rawRecords = $vbQuery->get()->unique('id')->values();
        $bookingIds = $rawRecords->pluck('id')->filter()->unique()->all();

        // 1. Load equipment requested via venue_booking_equipment
        $equipmentItemsMap = [];
        if (!empty($bookingIds)) {
            $eqItems = DB::table('venue_booking_equipment')
                ->leftJoin('equipment_types', 'venue_booking_equipment.equipment_type_id', '=', 'equipment_types.id')
                ->whereIn('venue_booking_equipment.venue_booking_id', $bookingIds)
                ->select(
                    'venue_booking_equipment.venue_booking_id',
                    'venue_booking_equipment.equipment_type_id',
                    'venue_booking_equipment.quantity_requested as quantity',
                    DB::raw("COALESCE(equipment_types.name, equipment_types.eq_name, equipment_types.equipment_types_name, 'Equipment') as name"),
                    'equipment_types.built_in_units'
                )
                ->get();
            foreach ($eqItems as $item) {
                $equipmentItemsMap[$item->venue_booking_id][] = [
                    'name' => $item->name,
                    'quantity' => (int)($item->quantity ?: 1),
                    'equipment_type_id' => $item->equipment_type_id,
                ];
            }
        }

        // 2. Load equipment units and types for barcode & built-in inspection mapping
        $allUnitsList = DB::table('equipment_units')
            ->leftJoin('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
            ->select(
                'equipment_units.id',
                'equipment_units.barcode',
                'equipment_units.serial_number',
                'equipment_units.brand',
                'equipment_units.model',
                'equipment_units.built_in_units',
                DB::raw("COALESCE(equipment_types.name, equipment_types.eq_name, equipment_types.equipment_types_name, 'Equipment') as type_name"),
                'equipment_types.built_in_units as type_built_in_units'
            )
            ->get();

        $allTypesList = DB::table('equipment_types')->get();
        $typeMap = [];
        foreach ($allTypesList as $t) {
            $tName = $t->eq_name ?: ($t->name ?: ($t->equipment_types_name ?: 'Component'));
            $typeMap[(string)$t->id] = $tName;
            $typeMap[strtolower($tName)] = $tName;
        }

        $unitLookup = [];
        foreach ($allUnitsList as $u) {
            $bCode = strtoupper(trim($u->barcode ?: ($u->serial_number ?: "UNIT-{$u->id}")));
            $unitLookup[$bCode] = $u;
            if ($u->id) $unitLookup[(string)$u->id] = $u;
        }

        $resolveUnitBuiltIns = function ($unit) use ($unitLookup, $typeMap, $allUnitsList) {
            if (!$unit) return [];
            $rawList = [];
            if (!empty($unit->built_in_units)) {
                $rawList = is_string($unit->built_in_units) ? json_decode($unit->built_in_units, true) : (array)$unit->built_in_units;
            } elseif (!empty($unit->type_built_in_units)) {
                $rawList = is_string($unit->type_built_in_units) ? json_decode($unit->type_built_in_units, true) : (array)$unit->type_built_in_units;
            }
            if (!is_array($rawList) || empty($rawList)) return [];

            $builtIns = [];
            foreach ($rawList as $biId) {
                $targetCode = strtoupper(trim((string)$biId));
                $found = $unitLookup[$targetCode] ?? null;
                if (!$found) {
                    $found = $allUnitsList->first(function ($item) use ($targetCode) {
                        return (string)$item->id === $targetCode || strtoupper(trim($item->barcode ?: '')) === $targetCode || strtoupper(trim($item->serial_number ?: '')) === $targetCode;
                    });
                }
                if ($found) {
                    $uName = trim(($found->brand ?: '') . ' ' . ($found->model ?: '')) ?: ($found->type_name ?: "Component #{$biId}");
                    $builtIns[] = [
                        'name' => $uName,
                        'barcode' => $found->barcode ?: ($found->serial_number ?: "UNIT-{$found->id}"),
                    ];
                } elseif (isset($typeMap[(string)$biId])) {
                    $tName = $typeMap[(string)$biId];
                    $builtIns[] = [
                        'name' => $tName,
                        'barcode' => $tName,
                    ];
                } else {
                    $builtIns[] = [
                        'name' => "Component #{$biId}",
                        'barcode' => (string)$biId,
                    ];
                }
            }
            return $builtIns;
        };

        return $rawRecords
            ->map(function ($b) use ($equipmentItemsMap, $unitLookup, $resolveUnitBuiltIns) {
                $item = (array) $b;
                $isCancelledOrRejected = in_array(strtolower($b->status ?? ''), ['cancelled', 'rejected', 'cancelled_by_user']);
                
                $reason = $b->rejection_reason ?? null;
                if ($isCancelledOrRejected && empty($reason)) {
                    try {
                        $reason = DB::table('approvals')
                            ->where(function ($q) {
                                $q->where('reference_type', 'avr_venue_booking')
                                  ->orWhere('reference_type', 'venue_booking');
                            })
                            ->where('reference_id', $b->id)
                            ->whereIn('action', ['rejected', 'cancelled'])
                            ->latest('id')
                            ->value('remarks');
                    } catch (\Throwable $e) {}
                }

                $isLate = !$isCancelledOrRejected && (!empty($b->is_late) || str_contains(strtolower($b->timeliness ?? ''), 'late') || str_contains(strtolower($b->violation_type ?? ''), 'late'));
                
                // If violation_type is strictly "Late Return, Extension", do not treat it as physical damage unless condition is damaged.
                $isStrictlyLate = $isLate && (strtolower($b->violation_type ?? '') === 'late return, extension' || strtolower($b->violation_type ?? '') === 'late return' || strtolower($b->violation_type ?? '') === 'late return / extension');
                
                $hasDamage = !$isCancelledOrRejected && (($b->inspection_condition ?? '') === 'damaged' || strtolower($b->status ?? '') === 'damaged' || (!empty($b->violation_type) && !$isStrictlyLate));
                
                $violationText = !$isCancelledOrRejected ? ($b->violation_type ?? ($hasDamage ? ($b->inspection_notes ?? 'Rule Violation / Damage Reported') : null)) : null;

                $rawAssigned = $b->assigned_units ?: ($b->booking_assigned_units ?? null);
                $assignedUnits = !$isCancelledOrRejected && $rawAssigned ? (is_string($rawAssigned) ? json_decode($rawAssigned, true) : $rawAssigned) : null;
                $unitConditions = !$isCancelledOrRejected && $b->unit_conditions ? (is_string($b->unit_conditions) ? json_decode($b->unit_conditions, true) : $b->unit_conditions) : null;

                $assignedUnitDetails = [];
                if (!$isCancelledOrRejected && !empty($assignedUnits) && is_array($assignedUnits)) {
                    $slotIdx = 1;
                    foreach ($assignedUnits as $slotKey => $barcode) {
                        if (empty($barcode)) continue;
                        $uBarcode = (string)$barcode;
                        $matchedUnit = $unitLookup[strtoupper(trim($uBarcode))] ?? null;
                        $catName = $matchedUnit ? $matchedUnit->type_name : 'Equipment';
                        $cond = $unitConditions[$uBarcode] ?? ($unitConditions[$slotKey] ?? ($b->inspection_condition === 'damaged' ? 'Damaged' : 'Good'));
                        $builtIns = $matchedUnit ? $resolveUnitBuiltIns($matchedUnit) : [];
                        $assignedUnitDetails[] = [
                            'category' => $catName,
                            'slot' => "Unit #{$slotIdx}",
                            'barcode' => $uBarcode,
                            'condition' => ucfirst(strtolower((string)$cond)),
                            'built_ins' => $builtIns,
                        ];
                        $slotIdx++;
                    }
                }

                $eqItems = $equipmentItemsMap[$b->id] ?? [];
                if (empty($eqItems) && !empty($assignedUnitDetails)) {
                    $counts = [];
                    foreach ($assignedUnitDetails as $detail) {
                        $c = $detail['category'] ?: 'Equipment';
                        $counts[$c] = ($counts[$c] ?? 0) + 1;
                    }
                    foreach ($counts as $cName => $cQty) {
                        $eqItems[] = [
                            'name' => $cName,
                            'quantity' => $cQty,
                        ];
                    }
                }

                $fullNameParts = array_filter([$b->first_name ?? null, $b->middle_name ?? null, $b->last_name ?? null, $b->suffix ?? null]);
                $applicantName = !empty($fullNameParts) ? implode(' ', $fullNameParts) : ($b->filer_name ?: 'Applicant');

                $isEmailVerified = in_array($b->submission_channel ?? null, ['online_self', 'online', null], true);
                if (!$isEmailVerified && !empty($b->email_address)) {
                    $isEmailVerified = DB::table('email_verifications')
                        ->where('email', strtolower(trim($b->email_address)))
                        ->whereNotNull('verified_at')
                        ->exists();
                }

                $rawPhoto = !$isCancelledOrRejected ? ($b->evidence_photo ?? null) : null;
                $photoList = [];
                if (is_string($rawPhoto) && (str_starts_with(trim($rawPhoto), '[') || str_starts_with(trim($rawPhoto), '{'))) {
                    $decoded = json_decode($rawPhoto, true);
                    $photoList = is_array($decoded) ? array_values(array_filter($decoded)) : [$rawPhoto];
                } elseif (!empty($rawPhoto)) {
                    $photoList = [$rawPhoto];
                }

                if ($isCancelledOrRejected) {
                    $item['inspection_condition'] = null;
                    $item['inspection_notes'] = null;
                    $item['evidence_photo'] = null;
                    $item['violation_type'] = null;
                    $item['assigned_units'] = null;
                    $item['unit_conditions'] = null;
                    $assignedUnitDetails = [];
                    $eqItems = [];
                }

                $isAutoRejected = $isCancelledOrRejected && strtolower($b->status ?? '') === 'rejected' && !empty($b->is_auto_rejected);
                $finalReason = $isCancelledOrRejected ? ($reason ?: ($b->rejection_reason ?? null)) : null;

                return array_merge($item, [
                    'record_type'           => 'venue',
                    'reference_code'        => $b->reference_code ?: "TRK-AVR{$b->id}",
                    'applicant_name'        => $applicantName,
                    'is_email_verified'     => $isEmailVerified,
                    'equipment_items'       => $eqItems,
                    'assigned_unit_details' => $assignedUnitDetails,
                    'equipment_notes'       => $b->equipment_notes ?? '',
                    'is_late'               => $isLate,
                    'has_damage'            => $hasDamage,
                    'has_violation'         => !empty($violationText),
                    'violation'             => $violationText,
                    'violation_type'        => $b->violation_type ?? ($hasDamage ? 'Policy Breach Identified' : ($isLate ? 'Late Return' : null)),
                    'evidence_photo'        => $photoList[0] ?? null,
                    'evidence_photos'       => $photoList,
                    'endorsement_letter'    => $b->endorsement_letter ?: ($b->endorsement_url ?? null),
                    'assigned_units'        => $assignedUnits,
                    'unit_conditions'       => $unitConditions,
                    'violations'            => !empty($violationText) ? 1 : 0,
                    // Distinguishes a SPEC-RULE-4 automatic rejection (competing booking
                    // auto-rejected because another request for the same venue/slot was
                    // approved first) from a manual staff rejection — surfaced in the
                    // History Log UI as "Rejected (automatic)" with the winning reference.
                    'is_auto_rejected'              => $isAutoRejected,
                    'auto_reject_winning_reference' => $isAutoRejected ? ($b->auto_reject_winning_reference ?? null) : null,
                    'rejection_reason'              => $finalReason,
                    'remarks'                       => $finalReason,
                    'notes'                         => $finalReason ?: ($b->inspection_notes ?? null),
                ]);
            });
    }

    /**
     * Fetch and format completed/archived equipment borrowing history records
     */
    public function getEquipmentBorrowingsHistory(?int $officeId = null, bool $isSuperAdmin = true, ?int $academicTermId = null): Collection
    {
        $ebQuery = DB::table('equipment_borrows')
            ->leftJoin('tracking_numbers', function ($join) {
                $join->on('equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                     ->orWhere(function ($q) {
                         $q->whereIn('tracking_numbers.reservation_type', ['equipment_borrow', 'equipment_borrowing'])
                           ->whereColumn('tracking_numbers.reservation_id', 'equipment_borrows.id');
                     });
            })
            ->leftJoin('inspections', function ($join) {
                $join->on('equipment_borrows.id', '=', 'inspections.inspectable_id')
                     ->where(function ($q) {
                          $q->where('inspections.inspectable_type', 'like', '%EquipmentBorrow%')
                            ->orWhere('inspections.inspectable_type', 'equipment_borrow')
                            ->orWhere('inspections.inspectable_type', 'avr_equipment_borrowing');
                     })
                     ->where(function ($q2) {
                          $q2->whereIn('inspections.inspection_type', ['post_use', 'post_event'])
                             ->orWhereNull('inspections.inspection_type');
                     });
            })
            ->whereNull('equipment_borrows.archived_at')
            ->where(function ($query) {
                $activeStatuses = ['pending', 'approved', 'ongoing', 'on-going', 'inspection', 'post-inspection', 'reserved'];
                $query->where(function ($q) use ($activeStatuses) {
                    $q->whereNotNull('tracking_numbers.status')
                      ->whereNotIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), $activeStatuses);
                })->orWhere(function ($q) use ($activeStatuses) {
                    $q->whereNotNull('equipment_borrows.status')
                      ->whereNotIn(DB::raw('LOWER(TRIM(equipment_borrows.status))'), $activeStatuses);
                });
            })
            ->orderBy('inspections.id', 'desc');

        if ($academicTermId) {
            $ebQuery->where(function ($q) use ($academicTermId) {
                $q->where('equipment_borrows.academic_term_id', $academicTermId)
                  ->orWhereNull('equipment_borrows.academic_term_id');
            });
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
                'equipment_borrows.rejection_reason',
                'tracking_numbers.reference_code',
                DB::raw("COALESCE(tracking_numbers.status, equipment_borrows.status) as status"),
                'inspections.condition as inspection_condition',
                'inspections.notes as inspection_notes',
                'inspections.evidence_photo as evidence_photo',
                'inspections.is_late as is_late',
                'inspections.timeliness as timeliness',
                'inspections.minutes_late as minutes_late',
                'inspections.violation_type as violation_type',
                'inspections.assigned_units as inspection_assigned_units',
                'inspections.unit_conditions as inspection_unit_conditions',
                'equipment_borrows.assigned_units as eb_assigned_units',
                'equipment_borrows.returned_at',
                'inspections.inspected_at as post_inspected_at',
                'equipment_borrows.created_at',
                'equipment_borrows.updated_at'
            )
            ->orderByDesc('equipment_borrows.created_at');

        return $ebQuery->get()
            ->unique('id')
            ->values()
            ->map(function ($b) {
                $item = (array) $b;
                $isCancelledOrRejected = in_array(strtolower($b->status ?? ''), ['cancelled', 'rejected', 'cancelled_by_user']);

                $reason = $b->rejection_reason ?? null;
                if ($isCancelledOrRejected && empty($reason)) {
                    try {
                        $reason = DB::table('approvals')
                            ->where(function ($q) {
                                $q->where('reference_type', 'equipment_borrow')
                                  ->orWhere('reference_type', 'equipment_borrowing')
                                  ->orWhere('reference_type', 'avr_equipment_borrowing');
                            })
                            ->where('reference_id', $b->id)
                            ->whereIn('action', ['rejected', 'cancelled'])
                            ->latest('id')
                            ->value('remarks');
                    } catch (\Throwable $e) {}
                }

                $assignedRaw = $b->inspection_assigned_units ?? $b->eb_assigned_units ?? null;
                $assignedUnits = $assignedRaw ? (is_string($assignedRaw) ? json_decode($assignedRaw, true) : $assignedRaw) : null;
                $unitCondRaw = $b->inspection_unit_conditions ?? null;
                $unitConditions = $unitCondRaw ? (is_string($unitCondRaw) ? json_decode($unitCondRaw, true) : $unitCondRaw) : null;

                $isDamaged = ($b->inspection_condition ?? '') === 'damaged' || strtolower($b->status ?? '') === 'damaged';
                $isLost = ($b->inspection_condition ?? '') === 'lost' || strtolower($b->status ?? '') === 'lost';
                $isLate = !empty($b->is_late) || str_contains(strtolower($b->timeliness ?? ''), 'late') || str_contains(strtolower($b->violation_type ?? ''), 'overdue') || str_contains(strtolower($b->status ?? ''), 'late');

                if (is_array($unitConditions)) {
                    foreach ($unitConditions as $condVal) {
                        $condStr = strtolower(is_array($condVal) ? ($condVal['condition'] ?? $condVal['status'] ?? '') : (string)$condVal);
                        if ($condStr === 'lost') $isLost = true;
                        if ($condStr === 'damaged') $isDamaged = true;
                    }
                }

                $hasViolation = $isDamaged || $isLost || $isLate || !empty($b->violation_type);
                $violationText = $b->violation_type ?? ($hasViolation ? ($b->inspection_notes ?? 'Policy Breach / Inspection Outcome Recorded') : null);

                if ($isCancelledOrRejected) {
                    $item['inspection_condition'] = null;
                    $item['inspection_notes'] = null;
                    $item['evidence_photo'] = null;
                    $item['violation_type'] = null;
                    $item['inspection_assigned_units'] = null;
                    $item['inspection_unit_conditions'] = null;
                    $assignedUnits = null;
                    $unitConditions = null;
                    $isDamaged = false;
                    $isLost = false;
                    $isLate = false;
                    $hasViolation = false;
                    $violationText = null;
                }

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

                $rawEbPhoto = !$isCancelledOrRejected ? ($b->evidence_photo ?? null) : null;
                $ebPhotoList = [];
                if (is_string($rawEbPhoto) && (str_starts_with(trim($rawEbPhoto), '[') || str_starts_with(trim($rawEbPhoto), '{'))) {
                    $decoded = json_decode($rawEbPhoto, true);
                    $ebPhotoList = is_array($decoded) ? array_values(array_filter($decoded)) : [$rawEbPhoto];
                } elseif (!empty($rawEbPhoto)) {
                    $ebPhotoList = [$rawEbPhoto];
                }

                $finalReason = $isCancelledOrRejected ? ($reason ?: ($b->rejection_reason ?? null)) : null;

                // Resolve each assigned unit (key "itemIndex-unitIndex" => barcode) to its real serial number
                $unitDetails = [];
                if (is_array($assignedUnits)) {
                    $barcodes = array_values(array_filter(array_map('strval', array_values($assignedUnits))));
                    $unitRows = [];
                    if (!empty($barcodes)) {
                        try {
                            $unitRows = DB::table('equipment_units')
                                ->where(function ($q) use ($barcodes) {
                                    $q->whereIn('barcode', $barcodes)->orWhereIn('serial_number', $barcodes);
                                })
                                ->get()
                                ->keyBy(fn ($u) => (string) ($u->barcode ?: $u->serial_number));
                        } catch (\Throwable $th) {}
                    }
                    foreach ($assignedUnits as $key => $code) {
                        $code = (string) $code;
                        $row = is_object($unitRows) ? ($unitRows[$code] ?? null) : null;
                        $itemIdx = (int) explode('-', (string) $key)[0];
                        $unitDetails[] = [
                            'key'            => (string) $key,
                            'equipment_name' => $items[$itemIdx]['equipment_name'] ?? ($items[0]['equipment_name'] ?? 'Equipment Item'),
                            'serial_number'  => $row->serial_number ?? $code,
                            'barcode'        => $row->barcode ?? $code,
                            'brand'          => $row->brand ?? null,
                            'model'          => $row->model ?? null,
                        ];
                    }
                }

                return array_merge($item, [
                    'unit_details'    => $unitDetails,
                    'record_type'     => 'equipment',
                    'reference_code'  => $b->reference_code ?: "EQ-{$b->id}",
                    'items'           => $items,
                    'equipment_name'  => !empty($items) ? ($items[0]['equipment_name'] ?? 'Equipment') : 'Equipment Item',
                    'quantity'        => !empty($items) ? ($items[0]['quantity_requested'] ?? 1) : 1,
                    'has_damage'      => $isDamaged,
                    'is_lost'         => $isLost,
                    'is_late'         => $isLate,
                    'has_violation'   => $hasViolation,
                    'violation'       => $violationText,
                    'violation_type'  => $b->violation_type ?? ($isLost ? 'Lost Property' : ($isDamaged ? 'Physical Damage' : ($isLate ? 'Late Return' : null))),
                    'evidence_photo'  => $ebPhotoList[0] ?? null,
                    'evidence_photos' => $ebPhotoList,
                    'assigned_units'  => $assignedUnits,
                    'unit_conditions' => $unitConditions,
                    'violations'      => $hasViolation ? 1 : 0,
                    'rejection_reason'=> $finalReason,
                    'remarks'         => $finalReason,
                    'notes'           => $finalReason ?: ($b->inspection_notes ?? null),
                ]);
            });
    }

    /**
     * Fetch and format all incident, damages, lost units, and policy violation history records
     */
    public function getIncidentsHistory(?int $officeId = null, bool $isSuperAdmin = true, ?int $academicTermId = null): Collection
    {
        $venues = $this->getVenueBookingsHistory($officeId, $isSuperAdmin, $academicTermId);
        $equipment = $this->getEquipmentBorrowingsHistory($officeId, $isSuperAdmin, $academicTermId);

        $incidents = collect();

        // 1. Process Venue Bookings
        foreach ($venues as $v) {
            $status = strtolower($v['status'] ?? '');
            if (in_array($status, ['cancelled', 'rejected', 'cancelled_by_user'])) {
                continue;
            }

            $hasDamage = !empty($v['has_damage']) || ($v['inspection_condition'] ?? '') === 'damaged';
            $hasViolation = !empty($v['has_violation']) || !empty($v['violation_type']);
            $unitConditions = $v['unit_conditions'] ?? [];

            $damagedUnits = [];
            $lostUnits = [];
            if (is_array($unitConditions)) {
                foreach ($unitConditions as $barcode => $val) {
                    $cond = strtolower(is_array($val) ? ($val['condition'] ?? '') : (string)$val);
                    if ($cond === 'damaged') $damagedUnits[] = $barcode;
                    if ($cond === 'lost') $lostUnits[] = $barcode;
                }
            }

            // Case A: Venue Physical Unit Damaged
            if (!empty($damagedUnits) || ($hasDamage && empty($lostUnits) && !$hasViolation)) {
                $incidents->push([
                    'id'                     => 'inc_venue_dmg_' . $v['id'],
                    'source_id'              => $v['id'],
                    'source_type'            => 'venue',
                    'reference_code'         => $v['reference_code'] ?? ('TRK-AVR' . $v['id']),
                    'filer_name'             => $v['filer_name'] ?? 'Requestor',
                    'program_office'         => $v['program_office'] ?? 'Department',
                    'department'             => $v['program_office'] ?? 'Department',
                    'facility_or_item'       => $v['venue_name'] ?? 'AVR Facility',
                    'incident_category'      => 'venue_unit_damaged',
                    'incident_label'         => 'Physical Unit Damaged',
                    'category_color'         => 'rose',
                    'flagged_units'          => $damagedUnits,
                    'violation_type'         => $v['violation_type'] ?? 'Physical Damage',
                    'notes'                  => $v['inspection_notes'] ?? ($v['purpose'] ?? 'Unit damaged during reservation'),
                    'date'                   => $v['date_of_usage'] ?? $v['created_at'],
                    'time_start'             => $v['time_start'] ?? '08:00',
                    'time_end'               => $v['time_end'] ?? '17:00',
                    'evidence_photos'        => $v['evidence_photos'] ?? [],
                    'evidence_photo'         => $v['evidence_photo'] ?? null,
                    'source_record'          => $v,
                ]);
            }

            // Case B: Venue Physical Unit Lost
            if (!empty($lostUnits)) {
                $incidents->push([
                    'id'                     => 'inc_venue_lost_' . $v['id'],
                    'source_id'              => $v['id'],
                    'source_type'            => 'venue',
                    'reference_code'         => $v['reference_code'] ?? ('TRK-AVR' . $v['id']),
                    'filer_name'             => $v['filer_name'] ?? 'Requestor',
                    'program_office'         => $v['program_office'] ?? 'Department',
                    'department'             => $v['program_office'] ?? 'Department',
                    'facility_or_item'       => $v['venue_name'] ?? 'AVR Facility',
                    'incident_category'      => 'venue_unit_lost',
                    'incident_label'         => 'Physical Unit Lost',
                    'category_color'         => 'amber',
                    'flagged_units'          => $lostUnits,
                    'violation_type'         => 'Lost Equipment Unit',
                    'notes'                  => $v['inspection_notes'] ?? 'Physical unit reported lost during booking.',
                    'date'                   => $v['date_of_usage'] ?? $v['created_at'],
                    'time_start'             => $v['time_start'] ?? '08:00',
                    'time_end'               => $v['time_end'] ?? '17:00',
                    'evidence_photos'        => $v['evidence_photos'] ?? [],
                    'evidence_photo'         => $v['evidence_photo'] ?? null,
                    'source_record'          => $v,
                ]);
            }

            // Case C: Venue Policy Violation
            if ($hasViolation) {
                $incidents->push([
                    'id'                     => 'inc_venue_viol_' . $v['id'],
                    'source_id'              => $v['id'],
                    'source_type'            => 'venue',
                    'reference_code'         => $v['reference_code'] ?? ('TRK-AVR' . $v['id']),
                    'filer_name'             => $v['filer_name'] ?? 'Requestor',
                    'program_office'         => $v['program_office'] ?? 'Department',
                    'department'             => $v['program_office'] ?? 'Department',
                    'facility_or_item'       => $v['venue_name'] ?? 'AVR Facility',
                    'incident_category'      => 'venue_policy_violation',
                    'incident_label'         => 'Venue Policy Violation',
                    'category_color'         => 'purple',
                    'flagged_units'          => [],
                    'violation_type'         => $v['violation_type'] ?? 'Facility Policy Violation',
                    'notes'                  => $v['inspection_notes'] ?? ($v['violation_type'] ?? 'Policy violation recorded'),
                    'date'                   => $v['date_of_usage'] ?? $v['created_at'],
                    'time_start'             => $v['time_start'] ?? '08:00',
                    'time_end'               => $v['time_end'] ?? '17:00',
                    'evidence_photos'        => $v['evidence_photos'] ?? [],
                    'evidence_photo'         => $v['evidence_photo'] ?? null,
                    'source_record'          => $v,
                ]);
            }
        }

        // 2. Process Equipment Borrowings
        foreach ($equipment as $e) {
            $isDamaged = !empty($e['has_damage']) || ($e['inspection_condition'] ?? '') === 'damaged';
            $isLost = !empty($e['is_lost']) || ($e['inspection_condition'] ?? '') === 'lost';
            $isLate = !empty($e['is_late']);
            $hasViolation = !empty($e['has_violation']) || !empty($e['violation_type']);
            $unitConditions = $e['unit_conditions'] ?? [];

            $damagedUnits = [];
            $lostUnits = [];
            if (is_array($unitConditions)) {
                foreach ($unitConditions as $barcode => $val) {
                    $cond = strtolower(is_array($val) ? ($val['condition'] ?? '') : (string)$val);
                    if ($cond === 'damaged') $damagedUnits[] = $barcode;
                    if ($cond === 'lost') $lostUnits[] = $barcode;
                }
            }

            // Case A: Equipment Unit Damaged
            if ($isDamaged || !empty($damagedUnits)) {
                $incidents->push([
                    'id'                     => 'inc_equip_dmg_' . $e['id'],
                    'source_id'              => $e['id'],
                    'source_type'            => 'equipment',
                    'reference_code'         => $e['reference_code'] ?? ('EQ-' . $e['id']),
                    'filer_name'             => $e['filer_name'] ?? 'Borrower',
                    'program_office'         => $e['program_office'] ?? 'Department',
                    'department'             => $e['program_office'] ?? 'Department',
                    'facility_or_item'       => $e['equipment_name'] ?? 'Equipment',
                    'incident_category'      => 'equipment_unit_damaged',
                    'incident_label'         => 'Physical Unit Damaged',
                    'category_color'         => 'rose',
                    'flagged_units'          => $damagedUnits,
                    'violation_type'         => $e['violation_type'] ?? 'Unit Damaged',
                    'notes'                  => $e['inspection_notes'] ?? ($e['purpose'] ?? 'Equipment damaged upon return'),
                    'date'                   => $e['date_of_usage'] ?? $e['created_at'],
                    'time_start'             => $e['time_start'] ?? '08:00',
                    'time_end'               => $e['time_end'] ?? '17:00',
                    'evidence_photos'        => $e['evidence_photos'] ?? [],
                    'evidence_photo'         => $e['evidence_photo'] ?? null,
                    'source_record'          => $e,
                ]);
            }

            // Case B: Equipment Unit Lost
            if ($isLost || !empty($lostUnits)) {
                $incidents->push([
                    'id'                     => 'inc_equip_lost_' . $e['id'],
                    'source_id'              => $e['id'],
                    'source_type'            => 'equipment',
                    'reference_code'         => $e['reference_code'] ?? ('EQ-' . $e['id']),
                    'filer_name'             => $e['filer_name'] ?? 'Borrower',
                    'program_office'         => $e['program_office'] ?? 'Department',
                    'department'             => $e['program_office'] ?? 'Department',
                    'facility_or_item'       => $e['equipment_name'] ?? 'Equipment',
                    'incident_category'      => 'equipment_unit_lost',
                    'incident_label'         => 'Physical Unit Lost',
                    'category_color'         => 'amber',
                    'flagged_units'          => $lostUnits,
                    'violation_type'         => 'Lost Equipment Unit',
                    'notes'                  => $e['inspection_notes'] ?? 'Equipment unit not returned / lost.',
                    'date'                   => $e['date_of_usage'] ?? $e['created_at'],
                    'time_start'             => $e['time_start'] ?? '08:00',
                    'time_end'               => $e['time_end'] ?? '17:00',
                    'evidence_photos'        => $e['evidence_photos'] ?? [],
                    'evidence_photo'         => $e['evidence_photo'] ?? null,
                    'source_record'          => $e,
                ]);
            }

            // Case C: Equipment Policy Violation or Late Return
            if (($hasViolation || $isLate) && !$isDamaged && !$isLost) {
                $incidents->push([
                    'id'                     => 'inc_equip_viol_' . $e['id'],
                    'source_id'              => $e['id'],
                    'source_type'            => 'equipment',
                    'reference_code'         => $e['reference_code'] ?? ('EQ-' . $e['id']),
                    'filer_name'             => $e['filer_name'] ?? 'Borrower',
                    'program_office'         => $e['program_office'] ?? 'Department',
                    'department'             => $e['program_office'] ?? 'Department',
                    'facility_or_item'       => $e['equipment_name'] ?? 'Equipment',
                    'incident_category'      => $isLate ? 'equipment_late_return' : 'equipment_policy_violation',
                    'incident_label'         => $isLate ? 'Late Return' : 'Equipment Policy Violation',
                    'category_color'         => $isLate ? 'orange' : 'purple',
                    'flagged_units'          => [],
                    'violation_type'         => $e['violation_type'] ?? ($isLate ? 'Late Return' : 'Policy Violation'),
                    'notes'                  => $e['inspection_notes'] ?? ($e['violation_type'] ?? 'Policy breach recorded'),
                    'date'                   => $e['date_of_usage'] ?? $e['created_at'],
                    'time_start'             => $e['time_start'] ?? '08:00',
                    'time_end'               => $e['time_end'] ?? '17:00',
                    'evidence_photos'        => $e['evidence_photos'] ?? [],
                    'evidence_photo'         => $e['evidence_photo'] ?? null,
                    'source_record'          => $e,
                ]);
            }
        }

        return $incidents->sortByDesc('date')->values();
    }
}
