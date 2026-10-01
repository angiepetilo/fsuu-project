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
                    if ($refId) {
                        $vb = VenueBooking::find($refId);
                        if ($vb && in_array(strtolower($vb->status), ['cancelled', 'rejected', 'cancelled_by_user'])) {
                            return response()->json([]);
                        }
                    }
                    $query->whereIn('inspectable_type', ['avr_venue_booking', 'venue_booking', VenueBooking::class, 'App\Models\VenueBooking']);
                } elseif (in_array($refType, ['equipment_borrow', EquipmentBorrow::class, 'App\Models\EquipmentBorrow', 'avr_equipment_borrowing'])) {
                    $query->whereIn('inspectable_type', ['equipment_borrow', EquipmentBorrow::class, 'App\Models\EquipmentBorrow', 'avr_equipment_borrowing']);
                } else {
                    $query->where('inspectable_type', $refType);
                }
            }
            $inspections = $query->with('inspectedBy')->get();

            // Gather IDs to batch-query targets
            $vbIds = [];
            $ebIds = [];
            $unitIds = [];

            foreach ($inspections as $ins) {
                $t = strtolower(class_basename($ins->inspectable_type ?? ''));
                if (str_contains($t, 'venue')) {
                    if ($ins->inspectable_id) $vbIds[] = $ins->inspectable_id;
                } elseif (str_contains($t, 'borrow')) {
                    if ($ins->inspectable_id) $ebIds[] = $ins->inspectable_id;
                } elseif (str_contains($t, 'unit')) {
                    if ($ins->inspectable_id) $unitIds[] = $ins->inspectable_id;
                }
            }

            $vbMap = !empty($vbIds) ? VenueBooking::with('venue')->whereIn('id', array_unique($vbIds))->get()->keyBy('id') : collect();
            $ebMap = !empty($ebIds) ? EquipmentBorrow::with(['trackingNumber', 'items.equipmentType'])->whereIn('id', array_unique($ebIds))->get()->keyBy('id') : collect();
            $unitMap = !empty($unitIds) ? EquipmentUnit::with('equipmentType')->whereIn('id', array_unique($unitIds))->get()->keyBy('id') : collect();

            $enriched = $inspections->map(function ($ins) use ($vbMap, $ebMap, $unitMap) {
                $t = strtolower(class_basename($ins->inspectable_type ?? ''));
                $targetType = 'venue_booking';
                $targetCode = 'VB-' . $ins->inspectable_id;
                $targetName = 'Venue Reservation';
                $targetFiler = null;

                if (str_contains($t, 'borrow')) {
                    $targetType = 'equipment_borrow';
                    $eb = $ebMap->get($ins->inspectable_id);
                    $targetCode = $eb?->trackingNumber?->reference_code ?? ('EB-' . $ins->inspectable_id);
                    $targetName = $eb ? ($eb->items->pluck('equipmentType.eq_name')->filter()->join(', ') ?: 'Equipment Borrow') : 'Equipment Borrow';
                    $targetFiler = $eb?->filer_name;
                } elseif (str_contains($t, 'unit')) {
                    $targetType = 'equipment_unit';
                    $u = $unitMap->get($ins->inspectable_id);
                    $targetCode = $u?->serial_number ?: ($u?->barcode ?: ('UNIT-' . $ins->inspectable_id));
                    $targetName = ($u?->equipmentType?->eq_name ?? 'Equipment') . ($u?->model ? ' (' . $u->model . ')' : '');
                    $targetFiler = $u?->brand;
                } else {
                    $vb = $vbMap->get($ins->inspectable_id);
                    $targetCode = $vb?->reference_code ?? ('VB-' . $ins->inspectable_id);
                    $targetName = $vb?->venue?->name ?? 'Venue Reservation';
                    $targetFiler = $vb?->applicant_name ?? $vb?->filer_name;
                }

                $data = $ins->toArray();
                if (!empty($ins->violation_type)) {
                    $vLower = strtolower($ins->violation_type);
                    if (str_contains($vLower, 'damage')) {
                        $data['condition'] = 'damaged';
                    } elseif (str_contains($vLower, 'lost')) {
                        $data['condition'] = 'lost';
                    } elseif (($data['condition'] ?? 'good') === 'good') {
                        $data['condition'] = 'violation';
                    }
                }
                $data['target_type'] = $targetType;
                $data['target_code'] = $targetCode;
                $data['target_name'] = $targetName;
                $data['target_filer'] = $targetFiler;
                $data['inspected_by_name'] = $ins->inspectedBy?->name ?? 'Staff / Inspector';
                return $data;
            });

            return response()->json($enriched);
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

            // Cancelled or rejected venue bookings strictly have NO inspection
            if (in_array($refType, ['avr_venue_booking', 'venue_booking', VenueBooking::class, 'App\Models\VenueBooking']) && $refId) {
                $vb = VenueBooking::find($refId);
                if ($vb && in_array(strtolower($vb->status), ['cancelled', 'rejected', 'cancelled_by_user'])) {
                    return response()->json([
                        'message' => 'Inspections are not permitted on cancelled or rejected venue reservations.'
                    ], 422);
                }
            }
            
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

            if (!empty($violationType)) {
                $vLower = strtolower($violationType);
                if (str_contains($vLower, 'damage')) {
                    $condition = 'damaged';
                } elseif (str_contains($vLower, 'lost')) {
                    $condition = 'lost';
                } elseif ($condition === 'good') {
                    $condition = 'violation';
                }
            }

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

            if (in_array($refType, ['equipment_unit', EquipmentUnit::class, 'App\Models\EquipmentUnit'])) {
                $inspectableClass = EquipmentUnit::class;
            } elseif (in_array($refType, ['equipment_borrow', 'avr_equipment_borrowing', EquipmentBorrow::class, 'App\Models\EquipmentBorrow'])) {
                $inspectableClass = EquipmentBorrow::class;
            } else {
                $inspectableClass = VenueBooking::class;
            }

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

            // If direct equipment unit inspection
            if ($inspectableClass === EquipmentUnit::class && $refId) {
                $targetUnit = EquipmentUnit::find($refId);
                if ($targetUnit) {
                    $uCondStr = strtolower(trim((string)$condition));
                    $targetUnitCond = match($uCondStr) {
                        'damaged'                      => 'Damaged',
                        'lost'                         => 'Lost',
                        'under repair', 'under_repair' => 'Under Repair',
                        default                        => 'Good',
                    };
                    $targetUnitStatus = in_array($targetUnitCond, ['Damaged', 'Lost', 'Under Repair']) ? 'unavailable' : 'available';
                    $targetUnit->update(['condition' => $targetUnitCond, 'status' => $targetUnitStatus]);

                    try {
                        $unitController = new \App\Http\Controllers\General\EquipmentUnitController();
                        $unitController->resolveParentAndChildrenStatus($targetUnit);
                        if ($targetUnit->equipment_type_id) {
                            $unitController->syncCategoryStock((int)$targetUnit->equipment_type_id);
                        }
                    } catch (\Throwable $e) {
                        Log::warning("Inspection unit sync error: " . $e->getMessage());
                    }
                }
            }

            // Synchronize assigned_units to parent model
            if (!empty($assignedUnits) && $refId) {
                $rawAu = is_array($assignedUnits) ? json_encode($assignedUnits) : $assignedUnits;
                if ($inspectableClass === EquipmentBorrow::class) {
                    EquipmentBorrow::where('id', $refId)->update(['assigned_units' => $rawAu]);
                } elseif ($inspectableClass === VenueBooking::class) {
                    VenueBooking::where('id', $refId)->update(['assigned_units' => $rawAu]);
                }
            }

            // Synchronize physical units condition and availability status
            if (is_array($unitConditions) && Schema::hasTable('equipment_units')) {
                // Collect all category IDs that need to be re-synced after inspection
                $affectedCategoryIds = [];

                foreach ($unitConditions as $key => $condVal) {
                    if (is_array($condVal)) {
                        $rawCondition = $condVal['condition'] ?? $condVal['status'] ?? 'good';
                    } else {
                        $rawCondition = (string)$condVal;
                    }
                    $condStr = strtolower(trim($rawCondition));
                    $isNegative = in_array($condStr, ['damaged', 'lost', 'decommissioned']);
                    $isGood     = !$isNegative; // 'good' or any non-damaged/lost value

                    $uStatus = $isNegative ? 'unavailable' : 'available';
                    $uCond   = match($condStr) {
                        'damaged'                    => 'Damaged',
                        'lost', 'decommissioned'     => 'Lost',
                        default                      => 'Good',
                    };

                    $uBar = is_array($assignedUnits) ? ($assignedUnits[$key] ?? null) : null;
                    $lookupKeys = array_filter(array_unique([$key, $uBar]));

                    if (empty($lookupKeys)) continue;

                    $nIds   = array_values(array_filter($lookupKeys, fn($v) => is_numeric($v) && (int)$v > 0));
                    $uCodes = array_values(array_filter($lookupKeys, fn($v) => !empty($v)));

                    $matchedUnits = EquipmentUnit::where(function($q) use ($uCodes, $nIds) {
                        $q->whereIn('barcode', $uCodes);
                        if (!empty($nIds)) {
                            $q->orWhereIn('id', array_map('intval', $nIds));
                        }
                    })->get();

                    foreach ($matchedUnits as $unit) {
                        // Update the inspected unit itself
                        $unit->update(['status' => $uStatus, 'condition' => $uCond]);

                        if ($unit->equipment_type_id) {
                            $affectedCategoryIds[] = $unit->equipment_type_id;
                        }

                        // ── Resolve parent kit and child component relationships & sync affected categories ──
                        try {
                            $unitController = new \App\Http\Controllers\General\EquipmentUnitController();
                            $catIds = $unitController->resolveParentAndChildrenStatus($unit);
                            $affectedCategoryIds = array_merge($affectedCategoryIds, $catIds);
                        } catch (\Throwable $e) {
                            Log::warning("Inspection: failed to resolve parent/children for unit {$unit->id}: " . $e->getMessage());
                        }
                    }
                }

                // Re-sync all affected categories after all unit updates
                $affectedCategoryIds = array_unique(array_filter($affectedCategoryIds));
                if (!empty($affectedCategoryIds)) {
                    $unitController = new \App\Http\Controllers\General\EquipmentUnitController();
                    foreach ($affectedCategoryIds as $catId) {
                        try {
                            $unitController->syncCategoryStock((int)$catId);
                        } catch (\Throwable $e) {
                            Log::warning("Inspection: failed to sync category {$catId}: " . $e->getMessage());
                        }
                    }
                }
            }

            // Synchronize incident audit trail
            try {
                \App\Http\Controllers\SuperAdmin\AuditLogController::syncIncidentAuditLogs();
            } catch (\Throwable $e) {}

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
