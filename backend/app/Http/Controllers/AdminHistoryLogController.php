<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminHistoryLogController extends Controller
{
    /**
     * GET /admin/history-log?type=venue|equipment
     * Returns completed/done venue bookings and equipment borrowings.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $type = $request->query('type', 'all'); // 'venue' | 'equipment' | 'all'
            $user = $request->user();
            $isSuperAdmin = $user ? $user->isSuperAdmin() : true;
            $officeId = $user ? $user->office_id : null;

            $venueBookings       = collect();
            $equipmentBorrowings = collect();

            // ── Venue Bookings ──────────────────────────────────────────────────────
            if (in_array($type, ['venue', 'all'])) {
                $vbQuery = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                    ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
                    ->leftJoin('inspections', function($join) {
                        $join->on('venue_bookings.id', '=', 'inspections.inspectable_id');
                    })
                    ->leftJoin('documents', function($join) {
                        $join->on('venue_bookings.id', '=', 'documents.venue_booking_id');
                    })
                    ->whereNull('venue_bookings.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['completed', 'solved', 'done', 'damaged', 'violation'])
                    ->select(
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
                        'offices.name as office_name',
                        'offices.id as office_id',
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

                if (!$isSuperAdmin && $officeId) {
                    $vbQuery->where('offices.id', $officeId);
                }

                $venueBookings = $vbQuery->get()
                    ->unique('id')
                    ->values()
                    ->map(function ($b) {
                        $item = (array) $b;
                        $hasDamage = ($b->inspection_condition ?? '') === 'damaged' || strtolower($b->status ?? '') === 'damaged' || !empty($b->violation_type);
                        $violationText = $b->violation_type ?? $b->inspection_notes ?? ($hasDamage ? 'Rule Violation / Damage Reported' : null);

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

            // ── Equipment Borrowings ────────────────────────────────────────────────
            if (in_array($type, ['equipment', 'all'])) {
                $ebQuery = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('offices', 'equipment_borrows.office_id', '=', 'offices.id')
                    ->leftJoin('inspections', function($join) {
                        $join->on('equipment_borrows.id', '=', 'inspections.inspectable_id');
                    })
                    ->whereNull('equipment_borrows.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['completed', 'solved', 'done', 'damaged', 'lost', 'violation'])
                    ->select(
                        'equipment_borrows.id',
                        'equipment_borrows.filer_name',
                        'equipment_borrows.program_office',
                        'equipment_borrows.email_address',
                        'equipment_borrows.date_of_usage',
                        'equipment_borrows.time_start',
                        'equipment_borrows.time_end',
                        'equipment_borrows.purpose',
                        'equipment_borrows.contact_number as contact_no',
                        'offices.name as office_name',
                        'offices.id as office_id',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status',
                        'inspections.condition as inspection_condition',
                        'inspections.notes as inspection_notes',
                        'inspections.assigned_units as assigned_units',
                        'inspections.unit_conditions as unit_conditions',
                        'equipment_borrows.created_at',
                        'equipment_borrows.updated_at'
                    )
                    ->orderByDesc('equipment_borrows.created_at');

                if (!$isSuperAdmin && $officeId) {
                    $ebQuery->where('equipment_borrows.office_id', $officeId);
                }

                $equipmentBorrowings = $ebQuery->get()
                    ->unique('id')
                    ->values()
                    ->map(function ($b) {
                        $item = (array) $b;
                        $hasDamage = ($b->inspection_condition ?? '') === 'damaged' || strtolower($b->status ?? '') === 'damaged';
                        $violationText = $b->inspection_notes ?? ($hasDamage ? 'Rule Violation / Damage Reported' : null);

                        // Attach items
                        $items = [];
                        try {
                            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_borrow_items')) {
                                $items = DB::table('equipment_borrow_items')
                                    ->leftJoin('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
                                    ->where('equipment_borrow_items.equipment_borrow_id', $b->id)
                                    ->select(
                                        'equipment_borrow_items.*',
                                        'equipment_types.name as equipment_name',
                                        'equipment_types.eq_name'
                                    )
                                    ->get()
                                    ->map(function($it) {
                                        return [
                                            'id' => $it->id,
                                            'equipment_type_id' => $it->equipment_type_id,
                                            'equipment_name' => $it->equipment_name ?? $it->eq_name ?? 'Equipment Item',
                                            'quantity_requested' => $it->quantity_requested ?? $it->quantity ?? 1,
                                            'equipment_type' => [
                                                'id' => $it->equipment_type_id,
                                                'name' => $it->equipment_name ?? $it->eq_name ?? 'Equipment Item',
                                                'eq_name' => $it->eq_name ?? $it->equipment_name ?? 'Equipment Item',
                                            ]
                                        ];
                                    })
                                    ->toArray();
                            }
                        } catch (\Throwable $th) {
                            $items = [];
                        }

                        $assignedUnits = $b->assigned_units ? (is_string($b->assigned_units) ? json_decode($b->assigned_units, true) : $b->assigned_units) : null;
                        $unitConditions = $b->unit_conditions ? (is_string($b->unit_conditions) ? json_decode($b->unit_conditions, true) : $b->unit_conditions) : null;

                        return array_merge($item, [
                            'record_type'     => 'equipment',
                            'items'           => $items,
                            'equipment_name'  => !empty($items) ? ($items[0]['equipment_name'] ?? 'Equipment') : 'Equipment Item',
                            'quantity'        => !empty($items) ? ($items[0]['quantity_requested'] ?? 1) : 1,
                            'has_damage'      => $hasDamage,
                            'has_violation'   => !empty($violationText),
                            'violation'       => $violationText,
                            'assigned_units'  => $assignedUnits,
                            'unit_conditions' => $unitConditions,
                            'violations'      => !empty($violationText) ? 1 : 0,
                        ]);
                    });
            }

            if ($type === 'venue') {
                return response()->json(['venue_bookings' => $venueBookings, 'equipment_borrowings' => []]);
            }
            if ($type === 'equipment') {
                return response()->json(['venue_bookings' => [], 'equipment_borrowings' => $equipmentBorrowings]);
            }

            return response()->json([
                'venue_bookings'       => $venueBookings,
                'equipment_borrowings' => $equipmentBorrowings,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'venue_bookings'       => [],
                'equipment_borrowings' => [],
                'error'                => $e->getMessage()
            ], 200);
        }
    }

    /**
     * POST /admin/history-log/undo
     * Reverts a venue booking or equipment borrow from completed/damaged back to on-going.
     */
    public function undo(Request $request): JsonResponse
    {
        try {
            $id = $request->input('id');
            $type = $request->input('type', 'venue');

            if ($type === 'venue') {
                $booking = DB::table('venue_bookings')->where('id', $id)->first();
                if ($booking) {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
                        DB::table('venue_bookings')->where('id', $id)->update(['status' => 'on-going']);
                    }
                    DB::table('tracking_numbers')
                        ->where('id', $booking->tracking_number_id)
                        ->orWhere('reference_code', $booking->reference_code ?? '')
                        ->update(['status' => 'on-going']);
                }
            } else {
                $borrow = DB::table('equipment_borrows')->where('id', $id)->first();
                if ($borrow) {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'status')) {
                        DB::table('equipment_borrows')->where('id', $id)->update(['status' => 'on-going']);
                    }
                    DB::table('tracking_numbers')
                        ->where('id', $borrow->tracking_number_id)
                        ->orWhere('reference_code', $borrow->reference_code ?? '')
                        ->update(['status' => 'on-going']);
                }
            }

            return response()->json(['message' => 'Record successfully reverted back to ON-GOING status!']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to revert record.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /admin/history-log/venue/{id}   — soft delete a venue booking record
     */
    public function destroyVenue($id): JsonResponse
    {
        try {
            DB::table('venue_bookings')->where('id', $id)->update(['archived_at' => now()]);
            return response()->json(['message' => 'Venue history record archived.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to archive record.'], 500);
        }
    }

    /**
     * DELETE /admin/history-log/equipment/{id} — soft delete an equipment borrow record
     */
    public function destroyEquipment($id): JsonResponse
    {
        try {
            DB::table('equipment_borrows')->where('id', $id)->update(['archived_at' => now()]);
            return response()->json(['message' => 'Equipment history record archived.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to archive record.'], 500);
        }
    }
}
