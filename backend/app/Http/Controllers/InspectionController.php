<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InspectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $refId = $request->query('reference_id') ?? $request->query('inspectable_id');
        $query = Inspection::latest();

        if ($refId) {
            $query->where(function ($q) use ($refId) {
                $q->where('inspectable_id', $refId)
                  ->orWhere('reference_id', $refId);
            });
        }

        $refType = $request->query('reference_type') ?? $request->query('inspectable_type');
        if ($refType) {
            $query->where(function ($q) use ($refType) {
                if ($refType === 'avr_venue_booking' || $refType === 'venue_booking' || $refType === 'App\Models\VenueBooking') {
                    $q->whereIn('inspectable_type', ['avr_venue_booking', 'venue_booking', 'App\Models\VenueBooking'])
                      ->orWhereIn('reference_type', ['avr_venue_booking', 'venue_booking', 'App\Models\VenueBooking']);
                } elseif ($refType === 'equipment_borrow' || $refType === 'App\Models\EquipmentBorrow') {
                    $q->whereIn('inspectable_type', ['equipment_borrow', \App\Models\EquipmentBorrow::class])
                      ->orWhereIn('reference_type', ['equipment_borrow', \App\Models\EquipmentBorrow::class]);
                } else {
                    $q->where('inspectable_type', $refType)
                      ->orWhere('reference_type', $refType);
                }
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $refId = $request->input('reference_id') ?? $request->input('inspectable_id');
        $refType = $request->input('reference_type') ?? $request->input('inspectable_type') ?? 'avr_venue_booking';
        $photo = $request->input('evidence_photo') ?? $request->input('evidence_image');
        if ($request->hasFile('evidence_photo')) {
            $photo = $request->file('evidence_photo');
        }
        if ($photo) {
            $photo = app(\App\Services\MediaUploadService::class)->upload($photo, 'inspections');
        }
        $assignedUnits = $request->input('assigned_units');
        $unitConditions = $request->input('unit_conditions');
        $condition = $request->input('condition') ?? 'good';
        $notes = $request->input('notes') ?? '';
        $violationType = $request->input('violation_type');

        // Check if inspection record already exists for this booking/borrowing and inspection_type.
        // post_use and post_event are treated as the same inspection phase to avoid duplicates.
        $inspection = null;
        $incomingType = $request->input('inspection_type') ?? 'post_event';
        $lookupTypes = ($incomingType === 'post_use' || $incomingType === 'post_event')
            ? ['post_use', 'post_event']
            : [$incomingType];

        if ($refId) {
            $inspection = Inspection::where(function ($q) use ($refId) {
                $q->where('inspectable_id', $refId)
                  ->orWhere('reference_id', $refId);
            })
            ->whereIn('inspection_type', $lookupTypes)
            ->latest('updated_at')
            ->first();
        }

        $data = [
            'inspectable_type' => $refType === 'equipment_borrow' ? \App\Models\EquipmentBorrow::class : \App\Models\VenueBooking::class,
            'inspectable_id'   => $refId,
            'reference_type'   => $refType,
            'reference_id'     => $refId,
            'inspected_by'     => auth()->id() ?? 1,
            'inspection_type'  => $incomingType,
            'condition'        => $condition,
            'timeliness'       => $request->input('timeliness') ?? 'on_time',
            'is_late'          => $request->input('timeliness') === 'late',
            'notes'            => $notes,
            'violation_type'   => $violationType,
            'evidence_photo'   => $photo,
            'assigned_units'   => $assignedUnits,
            'unit_conditions'  => $unitConditions,
            'inspected_at'     => now(),
        ];

        if ($inspection) {
            $inspection->fill($data)->save();
        } else {
            $inspection = Inspection::forceCreate($data);
        }

        // Synchronize physical units condition and availability status
        if (is_array($unitConditions)) {
            foreach ($unitConditions as $key => $condVal) {
                if (is_array($condVal)) {
                    $rawCondition = $condVal['condition'] ?? $condVal['status'] ?? 'good';
                } else {
                    $rawCondition = $condVal;
                }
                $condStr = strtolower(trim((string)$rawCondition));
                $uStatus = ($condStr === 'damaged' || $condStr === 'lost') ? 'unavailable' : 'available';
                $uCond = $condStr === 'damaged' ? 'Damaged' : ($condStr === 'lost' ? 'Lost' : 'Good');
                
                \App\Models\EquipmentUnit::where(function($q) use ($key) {
                    $q->where('unit_code', $key)
                      ->orWhere('name', $key)
                      ->orWhere('barcode', $key)
                      ->orWhere('id', $key);
                })->update(['status' => $uStatus, 'condition' => $uCond]);
            }
        }

        // Broadcast live inventory update event
        try {
            event(new \App\Events\InventoryStockUpdated(null, 'inspected', ['condition' => $condition]));
        } catch (\Throwable $e) {}

        return response()->json($inspection, 200);
    }
}
