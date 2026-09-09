<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Inspection;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditLogController extends Controller
{
    /**
     * Auto-synchronize incidents from the inspections table into audit_logs table
     * ensuring:
     * 1. Venue bookings with policy violations (VENUE_POLICY_VIOLATION)
     * 2. Venue bookings with physical unit damaged or lost (VENUE_UNIT_DAMAGED, VENUE_UNIT_LOST)
     * 3. Equipment borrowings with physical unit damaged or lost (EQUIPMENT_UNIT_DAMAGED, EQUIPMENT_UNIT_LOST, EQUIPMENT_POLICY_VIOLATION)
     */
    public static function syncIncidentAuditLogs(): void
    {
        try {
            $inspections = Inspection::all();

            foreach ($inspections as $ins) {
                $rawType = strtolower($ins->inspectable_type ?? '');
                $isVenue = in_array($rawType, ['venue_booking', 'avr_venue_booking', 'app\models\venuebooking'])
                    || str_contains($ins->inspectable_type ?? '', 'VenueBooking');
                $isEquip = in_array($rawType, ['equipment_borrow', 'avr_equipment_borrowing', 'app\models\equipmentborrow'])
                    || str_contains($ins->inspectable_type ?? '', 'EquipmentBorrow');

                if (!$isVenue && !$isEquip) {
                    continue;
                }

                $condition = strtolower($ins->condition ?? 'good');
                $hasViolation = !empty($ins->violation_type);

                // Decode unit conditions & assigned units
                $unitConds = $ins->unit_conditions;
                if (is_string($unitConds)) {
                    try { $unitConds = json_decode($unitConds, true); } catch (\Throwable $t) { $unitConds = []; }
                }
                $assignedUnits = $ins->assigned_units;
                if (is_string($assignedUnits)) {
                    try { $assignedUnits = json_decode($assignedUnits, true); } catch (\Throwable $t) { $assignedUnits = []; }
                }

                $damagedUnits = [];
                $lostUnits = [];

                if (is_array($unitConds)) {
                    foreach ($unitConds as $key => $cVal) {
                        $cStr = strtolower(is_array($cVal) ? ($cVal['condition'] ?? $cVal['status'] ?? '') : (string)$cVal);
                        $barcode = null;
                        if (is_array($assignedUnits) && isset($assignedUnits[$key])) {
                            $barcode = $assignedUnits[$key];
                        } elseif (is_array($assignedUnits)) {
                            if (preg_match('/-(\d+)$/', $key, $m)) {
                                $idx = (int)$m[1];
                                $vals = array_values($assignedUnits);
                                if (isset($vals[$idx])) $barcode = $vals[$idx];
                            }
                        }
                        if (!$barcode && !empty($key) && !str_contains($key, '-')) {
                            $barcode = $key;
                        }
                        if (!$barcode) {
                            $barcode = (string)$key;
                        }

                        if ($cStr === 'damaged') {
                            $damagedUnits[] = $barcode;
                        } elseif ($cStr === 'lost' || $cStr === 'missing') {
                            $lostUnits[] = $barcode;
                        }
                    }
                }

                if ($condition === 'damaged' && empty($damagedUnits)) {
                    if (is_array($assignedUnits) && !empty($assignedUnits)) {
                        $damagedUnits = array_values($assignedUnits);
                    } else {
                        $damagedUnits = ['Facility Physical Unit'];
                    }
                }
                if ($condition === 'lost' && empty($lostUnits)) {
                    if (is_array($assignedUnits) && !empty($assignedUnits)) {
                        $lostUnits = array_values($assignedUnits);
                    } else {
                        $lostUnits = ['Facility Physical Unit'];
                    }
                }

                $filterComposite = function(array $units) {
                    $real = array_filter($units, fn($u) => !str_contains((string)$u, '-'));
                    return !empty($real) ? array_values(array_unique($real)) : array_values(array_unique($units));
                };

                $damagedUnits = $filterComposite(array_filter($damagedUnits));
                $lostUnits = $filterComposite(array_filter($lostUnits));

                // Actor / Staff Inspector
                $userId = $ins->inspected_by ?: (User::value('id') ?? 1);

                if ($isVenue) {
                    $vb = VenueBooking::with(['trackingNumber', 'venue', 'department'])->find($ins->inspectable_id);
                    if (!$vb) continue;

                    $refCode = $vb->reference_code ?: ('TRK-AVR' . str_pad($vb->id, 4, '0', STR_PAD_LEFT));
                    $filerName = $vb->filer_name ?: 'Requestor';
                    $dept = $vb->department?->name ?? $vb->program_office ?? 'Academic Dept';
                    $venueName = $vb->venue?->name ?? 'AVR Facility';
                    $contact = $vb->contact_number ?? 'N/A';
                    $email = $vb->email_address ?? 'N/A';
                    $photos = $ins->evidence_photos ?: [];

                    // 1. Venue Booking Policy Violation
                    if ($hasViolation) {
                        $existing = AuditLog::where('action', 'VENUE_POLICY_VIOLATION')
                            ->where('auditable_type', 'venue_bookings')
                            ->where('auditable_id', $vb->id)
                            ->first();

                        if (!$existing) {
                            AuditLog::create([
                                'user_id'        => $userId,
                                'action'         => 'VENUE_POLICY_VIOLATION',
                                'auditable_type' => 'venue_bookings',
                                'auditable_id'   => $vb->id,
                                'ip_address'     => '127.0.0.1',
                                'user_agent'     => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AVR Terminal',
                                'created_at'     => $ins->inspected_at ?? $ins->created_at ?? now(),
                                'metadata'       => [
                                    'inspection_id'     => $ins->id,
                                    'target_type'       => 'venue_booking',
                                    'reference_code'    => $refCode,
                                    'filer_name'        => $filerName,
                                    'department'        => $dept,
                                    'contact_number'    => $contact,
                                    'email_address'     => $email,
                                    'venue_name'        => $venueName,
                                    'violation_type'    => $ins->violation_type,
                                    'incident_category' => 'venue_policy_violation',
                                    'remarks'           => $ins->notes ?: "Facility policy violation logged during venue booking inspection.",
                                    'evidence_photos'   => $photos,
                                    'device'            => 'Web Client (AVR Staff Terminal)',
                                ],
                            ]);
                        }
                    }

                    // 2. Venue Booking Damaged Physical Units
                    if (!empty($damagedUnits)) {
                        $existing = AuditLog::where('action', 'VENUE_UNIT_DAMAGED')
                            ->where('auditable_type', 'venue_bookings')
                            ->where('auditable_id', $vb->id)
                            ->first();

                        if (!$existing) {
                            $barcodeStr = implode(', ', $damagedUnits);
                            AuditLog::create([
                                'user_id'        => $userId,
                                'action'         => 'VENUE_UNIT_DAMAGED',
                                'auditable_type' => 'venue_bookings',
                                'auditable_id'   => $vb->id,
                                'ip_address'     => '127.0.0.1',
                                'user_agent'     => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AVR Terminal',
                                'created_at'     => $ins->inspected_at ?? $ins->created_at ?? now(),
                                'metadata'       => [
                                    'inspection_id'     => $ins->id,
                                    'target_type'       => 'venue_booking',
                                    'reference_code'    => $refCode,
                                    'filer_name'        => $filerName,
                                    'department'        => $dept,
                                    'contact_number'    => $contact,
                                    'email_address'     => $email,
                                    'venue_name'        => $venueName,
                                    'damaged_units'     => $damagedUnits,
                                    'incident_category' => 'venue_unit_damaged',
                                    'remarks'           => $ins->notes ?: "Physical unit(s) [{$barcodeStr}] damaged during venue booking.",
                                    'evidence_photos'   => $photos,
                                    'device'            => 'Web Client (AVR Staff Terminal)',
                                ],
                            ]);
                        }
                    }

                    // 3. Venue Booking Lost Physical Units
                    if (!empty($lostUnits)) {
                        $existing = AuditLog::where('action', 'VENUE_UNIT_LOST')
                            ->where('auditable_type', 'venue_bookings')
                            ->where('auditable_id', $vb->id)
                            ->first();

                        if (!$existing) {
                            $barcodeStr = implode(', ', $lostUnits);
                            AuditLog::create([
                                'user_id'        => $userId,
                                'action'         => 'VENUE_UNIT_LOST',
                                'auditable_type' => 'venue_bookings',
                                'auditable_id'   => $vb->id,
                                'ip_address'     => '127.0.0.1',
                                'user_agent'     => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AVR Terminal',
                                'created_at'     => $ins->inspected_at ?? $ins->created_at ?? now(),
                                'metadata'       => [
                                    'inspection_id'     => $ins->id,
                                    'target_type'       => 'venue_booking',
                                    'reference_code'    => $refCode,
                                    'filer_name'        => $filerName,
                                    'department'        => $dept,
                                    'contact_number'    => $contact,
                                    'email_address'     => $email,
                                    'venue_name'        => $venueName,
                                    'lost_units'        => $lostUnits,
                                    'incident_category' => 'venue_unit_lost',
                                    'remarks'           => $ins->notes ?: "Physical unit(s) [{$barcodeStr}] lost during venue booking.",
                                    'evidence_photos'   => $photos,
                                    'device'            => 'Web Client (AVR Staff Terminal)',
                                ],
                            ]);
                        }
                    }
                } elseif ($isEquip) {
                    $eb = EquipmentBorrow::with(['trackingNumber', 'department', 'items.equipmentType'])->find($ins->inspectable_id);
                    if (!$eb) continue;

                    $refCode = $eb->reference_code ?: ('EQ-' . str_pad($eb->id, 5, '0', STR_PAD_LEFT));
                    $filerName = $eb->filer_name ?: 'Borrower';
                    $dept = $eb->department?->name ?? $eb->program_office ?? 'Academic Dept';
                    $contact = $eb->contact_number ?? 'N/A';
                    $email = $eb->email_address ?? 'N/A';
                    $equipName = $eb->items->first()?->equipmentType?->name ?? 'Equipment Item';
                    $photos = $ins->evidence_photos ?: [];

                    // 1. Equipment Borrow Damaged Units
                    if (!empty($damagedUnits)) {
                        $existing = AuditLog::where('action', 'EQUIPMENT_UNIT_DAMAGED')
                            ->where('auditable_type', 'equipment_borrows')
                            ->where('auditable_id', $eb->id)
                            ->first();

                        if (!$existing) {
                            $barcodeStr = implode(', ', $damagedUnits);
                            AuditLog::create([
                                'user_id'        => $userId,
                                'action'         => 'EQUIPMENT_UNIT_DAMAGED',
                                'auditable_type' => 'equipment_borrows',
                                'auditable_id'   => $eb->id,
                                'ip_address'     => '127.0.0.1',
                                'user_agent'     => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AVR Terminal',
                                'created_at'     => $ins->inspected_at ?? $ins->created_at ?? now(),
                                'metadata'       => [
                                    'inspection_id'     => $ins->id,
                                    'target_type'       => 'equipment_borrow',
                                    'reference_code'    => $refCode,
                                    'filer_name'        => $filerName,
                                    'department'        => $dept,
                                    'contact_number'    => $contact,
                                    'email_address'     => $email,
                                    'equipment_name'    => $equipName,
                                    'damaged_units'     => $damagedUnits,
                                    'incident_category' => 'equipment_unit_damaged',
                                    'remarks'           => $ins->notes ?: "Equipment unit(s) [{$barcodeStr}] returned in damaged condition.",
                                    'evidence_photos'   => $photos,
                                    'device'            => 'Web Client (AVR Staff Terminal)',
                                ],
                            ]);
                        }
                    }

                    // 2. Equipment Borrow Lost Units
                    if (!empty($lostUnits)) {
                        $existing = AuditLog::where('action', 'EQUIPMENT_UNIT_LOST')
                            ->where('auditable_type', 'equipment_borrows')
                            ->where('auditable_id', $eb->id)
                            ->first();

                        if (!$existing) {
                            $barcodeStr = implode(', ', $lostUnits);
                            AuditLog::create([
                                'user_id'        => $userId,
                                'action'         => 'EQUIPMENT_UNIT_LOST',
                                'auditable_type' => 'equipment_borrows',
                                'auditable_id'   => $eb->id,
                                'ip_address'     => '127.0.0.1',
                                'user_agent'     => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AVR Terminal',
                                'created_at'     => $ins->inspected_at ?? $ins->created_at ?? now(),
                                'metadata'       => [
                                    'inspection_id'     => $ins->id,
                                    'target_type'       => 'equipment_borrow',
                                    'reference_code'    => $refCode,
                                    'filer_name'        => $filerName,
                                    'department'        => $dept,
                                    'contact_number'    => $contact,
                                    'email_address'     => $email,
                                    'equipment_name'    => $equipName,
                                    'lost_units'        => $lostUnits,
                                    'incident_category' => 'equipment_unit_lost',
                                    'remarks'           => $ins->notes ?: "Equipment unit(s) [{$barcodeStr}] reported lost / unreturned.",
                                    'evidence_photos'   => $photos,
                                    'device'            => 'Web Client (AVR Staff Terminal)',
                                ],
                            ]);
                        }
                    }

                    // 3. Equipment Borrow Policy Violation (or Late Return)
                    if ($hasViolation && empty($damagedUnits) && empty($lostUnits)) {
                        $existing = AuditLog::where('action', 'EQUIPMENT_POLICY_VIOLATION')
                            ->where('auditable_type', 'equipment_borrows')
                            ->where('auditable_id', $eb->id)
                            ->first();

                        if (!$existing) {
                            AuditLog::create([
                                'user_id'        => $userId,
                                'action'         => 'EQUIPMENT_POLICY_VIOLATION',
                                'auditable_type' => 'equipment_borrows',
                                'auditable_id'   => $eb->id,
                                'ip_address'     => '127.0.0.1',
                                'user_agent'     => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AVR Terminal',
                                'created_at'     => $ins->inspected_at ?? $ins->created_at ?? now(),
                                'metadata'       => [
                                    'inspection_id'     => $ins->id,
                                    'target_type'       => 'equipment_borrow',
                                    'reference_code'    => $refCode,
                                    'filer_name'        => $filerName,
                                    'department'        => $dept,
                                    'contact_number'    => $contact,
                                    'email_address'     => $email,
                                    'equipment_name'    => $equipName,
                                    'violation_type'    => $ins->violation_type,
                                    'incident_category' => 'equipment_policy_violation',
                                    'remarks'           => $ins->notes ?: ($ins->is_late ? "Late return recorded ({$ins->minutes_late} mins late)." : "Equipment policy violation recorded."),
                                    'evidence_photos'   => $photos,
                                    'device'            => 'Web Client (AVR Staff Terminal)',
                                ],
                            ]);
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("syncIncidentAuditLogs error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            // Auto-sync incidents and damage logs from inspections before querying
            self::syncIncidentAuditLogs();

            $query = AuditLog::with(['user.role'])->latest('id');

            // 1. Filter by Action Type / Category
            $action = $request->query('action');
            if ($action && $action !== 'all') {
                if ($action === 'approval' || $action === 'approvals') {
                    $query->whereIn('action', [
                        'VENUE_BOOKING_APPROVED', 'EQUIPMENT_BORROW_APPROVED',
                        'booking_approved', 'borrowing_approved', 'approved', 'APPROVAL'
                    ]);
                } elseif ($action === 'rejection' || $action === 'rejections') {
                    $query->whereIn('action', [
                        'VENUE_BOOKING_REJECTED', 'EQUIPMENT_BORROW_REJECTED',
                        'booking_rejected', 'borrowing_rejected', 'rejected', 'REJECTION'
                    ]);
                } elseif ($action === 'inspection' || $action === 'inspections') {
                    $query->where(function($q) {
                        $q->where('action', 'like', '%INSPECT%')
                          ->orWhere('auditable_type', 'inspections')
                          ->orWhereIn('action', ['INSPECTION_PERFORMED', 'INSPECTION_COMPLETED', 'INSPECTION_VIOLATION_LOGGED']);
                    });
                } elseif ($action === 'complete' || $action === 'completed') {
                    $query->whereIn('action', [
                        'VENUE_BOOKING_COMPLETED', 'EQUIPMENT_BORROW_COMPLETED',
                        'booking_completed', 'borrowing_completed', 'COMPLETED', 'complete'
                    ]);
                } elseif ($action === 'manage_equipment') {
                    $query->where(function($q) {
                        $q->where('action', 'like', '%EQUIPMENT%')
                          ->orWhere('auditable_type', 'equipment_types')
                          ->orWhere('auditable_type', 'equipment_units')
                          ->orWhere('auditable_type', 'equipment_borrows');
                    });
                } elseif ($action === 'add_user' || $action === 'users') {
                    $query->whereIn('action', ['USER_CREATED', 'USER_REGISTERED', 'USER_INVITED', 'USER_UPDATED', 'USER_ARCHIVED', 'ROLE_CREATED']);
                } elseif ($action === 'venue_creation') {
                    $query->whereIn('action', ['VENUE_CREATED', 'venue_created']);
                } elseif ($action === 'change_password') {
                    $query->whereIn('action', ['PASSWORD_CHANGED', 'PASSWORD_UPDATED']);
                } elseif ($action === 'verification_pin') {
                    $query->whereIn('action', ['VERIFICATION_PIN_UPDATED', 'PIN_VERIFIED', 'verification_pin_updated']);
                } elseif ($action === 'equipment_category') {
                    $query->whereIn('action', [
                        'EQUIPMENT_CATEGORY_CREATED', 'EQUIPMENT_CATEGORY_UPDATED', 'EQUIPMENT_CATEGORY_DELETED',
                        'CATEGORY_CREATED', 'CATEGORY_REQUEST_APPROVED'
                    ]);
                } elseif ($action === 'manage_venue') {
                    $query->where(function($q) {
                        $q->where('action', 'like', '%VENUE%')
                          ->orWhere('auditable_type', 'venues')
                          ->orWhere('auditable_type', 'venue_bookings');
                    });
                } elseif ($action === 'incidents' || $action === 'incidents_all') {
                    $query->whereIn('action', [
                        'VENUE_POLICY_VIOLATION',
                        'VENUE_UNIT_DAMAGED',
                        'VENUE_UNIT_LOST',
                        'EQUIPMENT_UNIT_DAMAGED',
                        'EQUIPMENT_UNIT_LOST',
                        'EQUIPMENT_POLICY_VIOLATION',
                        'INSPECTION_VIOLATION_LOGGED',
                        'DAMAGE_REPORTED',
                        'LOST_REPORTED',
                        'incident_logged',
                        'inspection_completed'
                    ]);
                } elseif ($action === 'incidents_venue_violation') {
                    $query->where('action', 'VENUE_POLICY_VIOLATION');
                } elseif ($action === 'incidents_venue_units') {
                    $query->whereIn('action', ['VENUE_UNIT_DAMAGED', 'VENUE_UNIT_LOST']);
                } elseif ($action === 'incidents_equipment_units') {
                    $query->whereIn('action', ['EQUIPMENT_UNIT_DAMAGED', 'EQUIPMENT_UNIT_LOST', 'EQUIPMENT_POLICY_VIOLATION']);
                } else {
                    $query->where('action', $action);
                }
            }

            // 2. Filter by User/Staff ID
            if ($request->filled('user_id')) {
                $query->where('user_id', (int)$request->query('user_id'));
            }

            // 3. Filter by Date range
            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->query('date_from'));
            }
            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->query('date_to'));
            }

            // 4. Keyword search (reference code, filer name, user name, ip, notes)
            if ($request->filled('search')) {
                $search = trim($request->query('search'));
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                      ->orWhere('ip_address', 'like', "%{$search}%")
                      ->orWhere('metadata', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($uq) use ($search) {
                          $uq->where('name', 'like', "%{$search}%")
                             ->orWhere('email', 'like', "%{$search}%")
                             ->orWhere('first_name', 'like', "%{$search}%")
                             ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }

            $perPage = min((int)$request->query('per_page', 30), 100);
            $logs = $query->paginate($perPage);

            // Compute summary statistics
            $totalApprovals = DB::table('audit_logs')
                ->whereIn('action', ['VENUE_BOOKING_APPROVED', 'EQUIPMENT_BORROW_APPROVED', 'booking_approved', 'borrowing_approved'])
                ->count();

            $totalRejections = DB::table('audit_logs')
                ->whereIn('action', ['VENUE_BOOKING_REJECTED', 'EQUIPMENT_BORROW_REJECTED', 'booking_rejected', 'borrowing_rejected'])
                ->count();

            $totalUserMgmt = DB::table('audit_logs')
                ->whereIn('action', ['USER_CREATED', 'USER_UPDATED', 'USER_ARCHIVED'])
                ->count();

            $totalIncidents = DB::table('audit_logs')
                ->whereIn('action', [
                    'VENUE_POLICY_VIOLATION',
                    'VENUE_UNIT_DAMAGED',
                    'VENUE_UNIT_LOST',
                    'EQUIPMENT_UNIT_DAMAGED',
                    'EQUIPMENT_UNIT_LOST',
                    'EQUIPMENT_POLICY_VIOLATION',
                    'INSPECTION_VIOLATION_LOGGED',
                    'DAMAGE_REPORTED',
                    'LOST_REPORTED',
                ])
                ->count();

            $totalLogs = DB::table('audit_logs')->count();

            return response()->json([
                'logs' => $logs,
                'stats' => [
                    'total_approvals'  => $totalApprovals,
                    'total_rejections' => $totalRejections,
                    'total_user_mgmt'  => $totalUserMgmt,
                    'total_incidents'  => $totalIncidents,
                    'total_logs'       => $totalLogs,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'logs'  => ['data' => []],
                'stats' => ['total_approvals' => 0, 'total_rejections' => 0, 'total_user_mgmt' => 0, 'total_incidents' => 0, 'total_logs' => 0],
                'error' => $e->getMessage(),
            ], 200);
        }
    }
}
