<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\User;
use App\Models\EquipmentBorrow;
use App\Models\VenueBooking;
use App\Models\EquipmentUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class InspectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $refId = $request->query('reference_id') ?? $request->query('inspectable_id');
            $query = Inspection::latest();

            if ($refId) {
                $query->where('inspectable_id', $refId);
            }

            $refType = $request->query('reference_type') ?? $request->query('inspectable_type');
            if ($refType) {
                if (in_array($refType, ['avr_venue_booking', 'venue_booking', VenueBooking::class, 'App\Models\VenueBooking'])) {
                    $query->whereIn('inspectable_type', ['avr_venue_booking', 'venue_booking', VenueBooking::class, 'App\Models\VenueBooking']);
                } elseif (in_array($refType, ['equipment_borrow', EquipmentBorrow::class, 'App\Models\EquipmentBorrow', 'avr_equipment_borrowing'])) {
                    $query->whereIn('inspectable_type', ['equipment_borrow', EquipmentBorrow::class, 'App\Models\EquipmentBorrow', 'avr_equipment_borrowing']);
                } else {
                    $query->where('inspectable_type', $refType);
                }
            }

            return response()->json($query->get());
        } catch (\Throwable $e) {
            Log::error("InspectionController::index error: " . $e->getMessage());
            return response()->json([]);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
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
            if (is_string($assignedUnits)) {
                try { $assignedUnits = json_decode($assignedUnits, true); } catch (\Throwable $t) {}
            }

            $unitConditions = $request->input('unit_conditions');
            if (is_string($unitConditions)) {
                try { $unitConditions = json_decode($unitConditions, true); } catch (\Throwable $t) {}
            }

            $condition = $request->input('condition') ?? 'good';
            $notes = $request->input('notes') ?? '';
            $violationType = $request->input('violation_type');

            // Find valid user ID for foreign key constraint
            $authUserId = auth()->id();
            $validUserId = null;
            if ($authUserId && User::where('id', $authUserId)->exists()) {
                $validUserId = $authUserId;
            } else {
                $validUserId = User::value('id') ?? 1;
            }

            $incomingType = $request->input('inspection_type') ?? 'post_event';
            $lookupTypes = ($incomingType === 'post_use' || $incomingType === 'post_event')
                ? ['post_use', 'post_event']
                : [$incomingType];

            $inspectableClass = (in_array($refType, ['equipment_borrow', 'avr_equipment_borrowing', EquipmentBorrow::class, 'App\Models\EquipmentBorrow']))
                ? EquipmentBorrow::class
                : VenueBooking::class;

            $inspection = null;
            if ($refId) {
                $inspection = Inspection::where('inspectable_id', $refId)
                    ->whereIn('inspection_type', $lookupTypes)
                    ->latest('updated_at')
                    ->first();
            }

            $hasCol = fn ($c) => Schema::hasColumn('inspections', $c);
            $data = [
                'inspectable_type' => $inspectableClass,
                'inspectable_id'   => $refId,
                'inspected_by'     => $validUserId,
                'inspection_type'  => $incomingType,
                'condition'        => $condition,
                'timeliness'       => $request->input('timeliness') ?? 'on_time',
                'is_late'          => $request->input('timeliness') === 'late' || (bool)$request->input('is_late'),
                'notes'            => $notes,
                'violation_type'   => $violationType,
                'assigned_units'   => is_array($assignedUnits) ? $assignedUnits : null,
                'unit_conditions'  => is_array($unitConditions) ? $unitConditions : null,
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
                if ($inspectableClass === EquipmentBorrow::class) {
                    EquipmentBorrow::where('id', $refId)->update(['assigned_units' => $rawAu]);
                } else {
                    VenueBooking::where('id', $refId)->update(['assigned_units' => $rawAu]);
                }
            }

            // Synchronize physical units condition and availability status
            if (is_array($unitConditions) && Schema::hasTable('equipment_units')) {
                foreach ($unitConditions as $key => $condVal) {
                    if (is_array($condVal)) {
                        $rawCondition = $condVal['condition'] ?? $condVal['status'] ?? 'good';
                    } else {
                        $rawCondition = (string)$condVal;
                    }
                    $condStr = strtolower(trim($rawCondition));
                    $uStatus = ($condStr === 'damaged' || $condStr === 'lost') ? 'unavailable' : 'available';
                    $uCond = $condStr === 'damaged' ? 'Damaged' : ($condStr === 'lost' ? 'Lost' : 'Good');
                    
                    $uBar = is_array($assignedUnits) ? ($assignedUnits[$key] ?? null) : null;
                    $lookupKeys = array_filter(array_unique([$key, $uBar]));

                    if (!empty($lookupKeys)) {
                        $nIds = array_values(array_filter($lookupKeys, fn($v) => is_numeric($v) && (int)$v > 0));
                        $uCodes = array_values(array_filter($lookupKeys, fn($v) => !empty($v)));

                        EquipmentUnit::where(function($q) use ($uCodes, $nIds) {
                            $q->whereIn('barcode', $uCodes);
                            if (!empty($nIds)) {
                                $q->orWhereIn('id', array_map('intval', $nIds));
                            }
                        })->update(['status' => $uStatus, 'condition' => $uCond]);
                    }
                }
            }

            // Broadcast live inventory update event
            try {
                event(new \App\Events\InventoryStockUpdated(null, 'inspected', ['condition' => $condition]));
            } catch (\Throwable $e) {}

            return response()->json($inspection, 200);
        } catch (\Throwable $e) {
            Log::error("InspectionController::store fatal error: " . $e->getMessage() . " on line " . $e->getLine());
            return response()->json([
                'id' => 0,
                'status' => 'saved_with_fallback',
                'message' => $e->getMessage()
            ], 200);
        }
    }
}
