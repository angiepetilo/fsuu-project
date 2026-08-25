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
            $query->where('inspectable_id', $refId);
        }

        $refType = $request->query('reference_type') ?? $request->query('inspectable_type');
        if ($refType) {
            if ($refType === 'avr_venue_booking' || $refType === 'venue_booking' || $refType === 'App\Models\VenueBooking' || $refType === \App\Models\VenueBooking::class) {
                $query->whereIn('inspectable_type', ['avr_venue_booking', 'venue_booking', \App\Models\VenueBooking::class]);
            } elseif ($refType === 'equipment_borrow' || $refType === 'App\Models\EquipmentBorrow' || $refType === \App\Models\EquipmentBorrow::class) {
                $query->whereIn('inspectable_type', ['equipment_borrow', \App\Models\EquipmentBorrow::class]);
            } else {
                $query->where('inspectable_type', $refType);
            }
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $refId = $request->input('reference_id') ?? $request->input('inspectable_id');
        $refType = $request->input('reference_type') ?? $request->input('inspectable_type') ?? 'avr_venue_booking';
        
        // Process Multiple Photos or Single Photo
        $photos = [];

        // 1. Multipart Form Files: evidence_photos[]
        if ($request->hasFile('evidence_photos')) {
            $files = $request->file('evidence_photos');
            if (is_array($files)) {
                foreach ($files as $f) {
                    if ($f) {
                        $uploaded = app(\App\Services\MediaUploadService::class)->upload($f, 'inspections');
                        if ($uploaded) $photos[] = $uploaded;
                    }
                }
            } else {
                $uploaded = app(\App\Services\MediaUploadService::class)->upload($files, 'inspections');
                if ($uploaded) $photos[] = $uploaded;
            }
        }

        // 2. Multipart Form Single File: evidence_photo
        if ($request->hasFile('evidence_photo')) {
            $uploaded = app(\App\Services\MediaUploadService::class)->upload($request->file('evidence_photo'), 'inspections');
            if ($uploaded && !in_array($uploaded, $photos)) {
                $photos[] = $uploaded;
            }
        }

        // 3. Array of Base64 or URLs: evidence_photos
        if ($request->has('evidence_photos') && empty($photos)) {
            $inputPhotos = $request->input('evidence_photos');
            if (is_string($inputPhotos)) {
                $decoded = json_decode($inputPhotos, true);
                $inputPhotos = is_array($decoded) ? $decoded : [$inputPhotos];
            }
            if (is_array($inputPhotos)) {
                foreach ($inputPhotos as $item) {
                    if (!empty($item)) {
                        $uploaded = app(\App\Services\MediaUploadService::class)->upload($item, 'inspections');
                        if ($uploaded) $photos[] = $uploaded;
                    }
                }
            }
        }

        // 4. Single String / Base64: evidence_photo or evidence_image
        if (empty($photos)) {
            $single = $request->input('evidence_photo') ?? $request->input('evidence_image');
            if (!empty($single)) {
                if (is_string($single) && (str_starts_with(trim($single), '[') || str_starts_with(trim($single), '{'))) {
                    $decoded = json_decode($single, true);
                    if (is_array($decoded)) {
                        foreach ($decoded as $item) {
                            $uploaded = app(\App\Services\MediaUploadService::class)->upload($item, 'inspections');
                            if ($uploaded) $photos[] = $uploaded;
                        }
                    }
                } else {
                    $uploaded = app(\App\Services\MediaUploadService::class)->upload($single, 'inspections');
                    if ($uploaded) $photos[] = $uploaded;
                }
            }
        }

        // Format into JSON string for column storage
        $photoPayload = null;
        if (!empty($photos)) {
            $photoPayload = json_encode(array_values(array_unique($photos)));
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
            $inspection = Inspection::where('inspectable_id', $refId)
            ->whereIn('inspection_type', $lookupTypes)
            ->latest('updated_at')
            ->first();
        }

        $hasCol = fn ($c) => \Illuminate\Support\Facades\Schema::hasColumn('inspections', $c);
        $data = [
            'inspectable_type' => $refType === 'equipment_borrow' ? \App\Models\EquipmentBorrow::class : \App\Models\VenueBooking::class,
            'inspectable_id'   => $refId,
            'inspected_by'     => auth()->id() ?? 1,
            'inspection_type'  => $incomingType,
            'condition'        => $condition,
            'timeliness'       => $request->input('timeliness') ?? 'on_time',
            'is_late'          => $request->input('timeliness') === 'late',
            'notes'            => $notes,
            'violation_type'   => $violationType,
            'assigned_units'   => $assignedUnits,
            'unit_conditions'  => $unitConditions,
            'inspected_at'     => now(),
        ];

        if ($hasCol('reference_type')) $data['reference_type'] = $refType;
        if ($hasCol('reference_id')) $data['reference_id'] = $refId;

        if ($photoPayload !== null || $request->has('evidence_photos') || $request->has('evidence_photo')) {
            $data['evidence_photo'] = $photoPayload;
        }

        if ($inspection) {
            $inspection->fill($data)->save();
        } else {
            $inspection = Inspection::forceCreate($data);
        }

        // Synchronize assigned_units to parent model
        if (!empty($assignedUnits) && $refId) {
            $rawAu = is_array($assignedUnits) ? json_encode($assignedUnits) : $assignedUnits;
            if ($refType === 'equipment_borrow' || ($data['inspectable_type'] ?? '') === \App\Models\EquipmentBorrow::class) {
                \App\Models\EquipmentBorrow::where('id', $refId)->update(['assigned_units' => $rawAu]);
            } else {
                \App\Models\VenueBooking::where('id', $refId)->update(['assigned_units' => $rawAu]);
            }
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
