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

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $refId = $request->input('reference_id') ?? $request->input('inspectable_id');
        $refType = $request->input('reference_type') ?? $request->input('inspectable_type') ?? 'avr_venue_booking';
        $condition = $request->input('condition') ?? ($request->boolean('has_damage') ? 'damaged' : 'good');
        $notes = $request->input('notes') ?? $request->input('condition_notes') ?? $request->input('remarks');
        $photo = $request->input('evidence_photo') ?? $request->input('evidence_image');
        $violationType = $request->input('violation_type');
        $assignedUnits = $request->input('assigned_units');
        $unitConditions = $request->input('unit_conditions');

        // Check if inspection record already exists for this booking/borrowing
        $inspection = null;
        if ($refId) {
            $inspection = Inspection::where(function ($q) use ($refId) {
                $q->where('inspectable_id', $refId)
                  ->orWhere('reference_id', $refId);
            })->first();
        }

        $data = [
            'inspectable_type' => $refType === 'equipment_borrow' ? \App\Models\EquipmentBorrow::class : \App\Models\VenueBooking::class,
            'inspectable_id'   => $refId,
            'reference_type'   => $refType,
            'reference_id'     => $refId,
            'inspected_by'     => auth()->id() ?? 1,
            'inspection_type'  => $request->input('inspection_type') ?? 'post_event',
            'condition'        => $condition,
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

        // Broadcast live inventory update event
        try {
            event(new \App\Events\InventoryStockUpdated(null, 'inspected', ['condition' => $condition]));
        } catch (\Throwable $e) {}

        return response()->json($inspection, 200);
    }
}
