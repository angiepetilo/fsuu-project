<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user ? $user->id : null;

            $readKeys = [];
            $allReadAt = null;
            if (Schema::hasTable('notification_reads')) {
                $readRecords = DB::table('notification_reads')
                    ->where('user_id', $userId)
                    ->get();

                foreach ($readRecords as $rr) {
                    if ($rr->notification_key === '__ALL_READ__') {
                        $allReadAt = $rr->read_at ? Carbon::parse($rr->read_at) : null;
                    } else {
                        $readKeys[$rr->notification_key] = true;
                    }
                }
            }

            $checkIsRead = function ($key, $date) use ($readKeys, $allReadAt) {
                if (isset($readKeys[$key])) return true;
                if ($allReadAt && $date) {
                    try {
                        if (Carbon::parse($date)->lte($allReadAt)) return true;
                    } catch (\Throwable $t) {}
                }
                return false;
            };

            $notifs = collect();

            $reportedReservationBarcodes = [];

            // 1. Critical Inspection Incidents (Damaged / Lost units, Policy Violations, Late Returns).
            // Each alert is derived from structured inspection data and verified against the CURRENT state of the
            // physical unit / booking so that resolved items no longer produce stale alerts.
            if (Schema::hasTable('inspections')) {
                $rawInspections = DB::table('inspections')
                    ->orderByDesc('id')
                    ->limit(50)
                    ->get();

                // Deduplicate by inspectable target so multiple/stale inspection rows don't spawn duplicate alerts
                $inspections = $rawInspections->unique(function ($item) {
                    return ($item->inspectable_type ?? '') . '-' . ($item->inspectable_id ?? '') . '-' . ($item->inspection_type ?? 'post');
                });

                $conditionOf = function ($v): string {
                    return strtolower(trim(is_array($v) ? ($v['condition'] ?? $v['status'] ?? '') : (string) $v));
                };

                foreach ($inspections as $ins) {
                    $inspType = strtolower($ins->inspectable_type ?? '');
                    $isVenueInsp = in_array($inspType, ['venue_booking', 'avr_venue_booking']) || str_contains($ins->inspectable_type ?? '', 'VenueBooking');
                    $isEquipInsp = in_array($inspType, ['equipment_borrow', 'avr_equipment_borrowing']) || str_contains($ins->inspectable_type ?? '', 'EquipmentBorrow');

                    $condition = strtolower($ins->condition ?? 'good');
                    $violationType = trim((string) ($ins->violation_type ?? ''));
                    $violationLower = strtolower($violationType);

                    // System-generated markers (not categories checked by staff). Strip them to find real violation categories.
                    $autoMarkers = ['Late Return, Extension', 'Physical Facility, Equipment Damage', 'Physical Equipment Damage', 'Lost Equipment', 'Late Return'];
                    $hasAutoLate = false;
                    $hasAutoDamage = false;
                    $hasAutoLost = false;
                    $remainingTypes = $violationType;
                    foreach ($autoMarkers as $marker) {
                        if (stripos($remainingTypes, $marker) !== false) {
                            $m = strtolower($marker);
                            if (str_contains($m, 'late')) $hasAutoLate = true;
                            if (str_contains($m, 'damage')) $hasAutoDamage = true;
                            if (str_contains($m, 'lost')) $hasAutoLost = true;
                            $remainingTypes = str_ireplace($marker, '', $remainingTypes);
                        }
                    }
                    // Categories checked by staff in the violation checklist (comma separated)
                    $violationCategories = array_values(array_filter(array_map('trim', explode(',', $remainingTypes)), fn ($v) => $v !== ''));
                    $isLate = (bool) ($ins->is_late ?? false) || strtolower($ins->timeliness ?? '') === 'late' || $hasAutoLate;

                    // Decode structured per-unit data
                    $assigned = is_string($ins->assigned_units ?? null) ? json_decode($ins->assigned_units, true) : ($ins->assigned_units ?? null);
                    $assigned = is_array($assigned) ? $assigned : [];
                    $rawUnitConds = is_string($ins->unit_conditions ?? null) ? json_decode($ins->unit_conditions, true) : ($ins->unit_conditions ?? null);
                    $rawUnitConds = is_array($rawUnitConds) ? $rawUnitConds : [];

                    // Resolve the exact barcodes flagged damaged / lost
                    $damagedCodes = [];
                    $lostCodes = [];
                    $hasUnitDamaged = false;
                    $hasUnitLost = false;
                    foreach ($rawUnitConds as $uKey => $cVal) {
                        $cStr = $conditionOf($cVal);
                        if ($cStr !== 'damaged' && $cStr !== 'lost') {
                            continue;
                        }
                        $code = $assigned[$uKey] ?? (preg_match('/-\d+$/', (string) $uKey) ? null : $uKey);
                        $code = is_string($code) && trim($code) !== '' ? trim($code) : null;
                        if ($cStr === 'damaged') {
                            $hasUnitDamaged = true;
                            if ($code) $damagedCodes[] = $code;
                        } else {
                            $hasUnitLost = true;
                            if ($code) $lostCodes[] = $code;
                        }
                    }
                    $damagedCodes = array_values(array_unique($damagedCodes));
                    $lostCodes = array_values(array_unique($lostCodes));

                    if ($isVenueInsp) {
                        // Venue inspections only raise hardware alerts if physical units were actually flagged
                        $isDamaged = $hasUnitDamaged;
                        $isLost = $hasUnitLost;
                    } else {
                        $isDamaged = $hasUnitDamaged || $condition === 'damaged' || $hasAutoDamage;
                        $isLost = $hasUnitLost || in_array($condition, ['lost', 'missing']) || $hasAutoLost;
                    }

                    // A genuine policy violation is a recorded rule breach that is NOT merely lateness / damage / loss
                    $isPolicyViolation = !empty($violationCategories);

                    if (!$isDamaged && !$isLost && !$isPolicyViolation && !$isLate) {
                        continue;
                    }

                    $personName = 'Borrower / Requestor';
                    $personContact = 'N/A';
                    $personOffice = 'FSUU Department';
                    $personEmail = 'N/A';
                    $refCode = 'TRK-INCIDENT';
                    $itemName = 'Physical Unit / Facility';
                    $unitCodes = array_values(array_filter($assigned, 'is_string'));

                    if ($isEquipInsp && Schema::hasTable('equipment_borrows')) {
                        $borrow = DB::table('equipment_borrows')
                            ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                            ->where('equipment_borrows.id', $ins->inspectable_id)
                            ->select('equipment_borrows.*', 'tracking_numbers.reference_code')
                            ->first();

                        if ($borrow) {
                            $personName = $borrow->filer_name ?? 'Borrower';
                            $personContact = $borrow->contact_number ?? 'N/A';
                            $personOffice = $borrow->program_office ?? 'Department';
                            $personEmail = $borrow->email_address ?? 'N/A';
                            $refCode = $borrow->reference_code ?? 'TRK-BORROW';
                            $itemName = 'Borrowed Equipment';
                        }
                    } elseif ($isVenueInsp && Schema::hasTable('venue_bookings')) {
                        $booking = DB::table('venue_bookings')
                            ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                            ->where('venue_bookings.id', $ins->inspectable_id)
                            ->select('venue_bookings.*', 'venues.name as venue_name', 'tracking_numbers.reference_code')
                            ->first();

                        if (!$booking || in_array(strtolower($booking->status ?? ''), ['cancelled', 'rejected', 'cancelled_by_user'])) {
                            continue;
                        }

                        $personName = $booking->filer_name ?? 'Requestor';
                        $personContact = $booking->contact_number ?? 'N/A';
                        $personOffice = $booking->program_office ?? 'Department';
                        $personEmail = $booking->email_address ?? 'N/A';
                        $refCode = $booking->reference_code ?? 'TRK-VENUE';
                        $itemName = $booking->venue_name ?? 'Venue Facility';
                    }

                    $rawDate = $ins->inspected_at ?? $ins->created_at ?? now();
                    $dt = Carbon::parse($rawDate);
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                    $recordType = $isVenueInsp ? 'venue_booking' : 'equipment_borrow';

                    // Drop units that have since been repaired / returned to service so alerts never go stale
                    $stillFlagged = function (array $codes, array $badStatuses) {
                        if (empty($codes) || !Schema::hasTable('equipment_units')) {
                            return $codes;
                        }
                        $known = DB::table('equipment_units')->whereIn('barcode', $codes)->get();
                        $knownCodes = $known->pluck('barcode')->all();
                        $bad = $known->filter(function ($u) use ($badStatuses) {
                            return in_array(strtolower($u->status ?? ''), $badStatuses)
                                || in_array(strtolower($u->condition ?? ''), $badStatuses);
                        })->pluck('barcode')->all();
                        return array_values(array_filter($codes, function ($c) use ($bad, $knownCodes) {
                            return in_array($c, $bad) || !in_array($c, $knownCodes);
                        }));
                    };

                    $base = [
                        'target_id'      => $ins->id,
                        'record_id'      => $ins->inspectable_id,
                        'record_type'    => $recordType,
                        'person_name'    => $personName,
                        'person_contact' => $personContact,
                        'person_office'  => $personOffice,
                        'person_email'   => $personEmail,
                        'ref'            => $refCode,
                        'time'           => $formattedTime,
                        'rawDate'        => $rawDate,
                    ];

                    // One-Notification-Per-Transaction Consolidation:
                    // Synthesize all issues (damaged, lost, late, policy violation) into exactly ONE unified alert for this transaction.
                    $effectiveDamagedCodes = [];
                    $effectiveLostCodes = [];
                    $hasDamaged = false;
                    $hasLost = false;

                    if ($isLost) {
                        $effectiveLostCodes = $stillFlagged($lostCodes, ['lost', 'missing']);
                        if (empty($lostCodes) || !empty($effectiveLostCodes)) {
                            $hasLost = true;
                            $reportedReservationBarcodes = array_merge($reportedReservationBarcodes, $effectiveLostCodes);
                        }
                    }

                    if ($isDamaged) {
                        $effectiveDamagedCodes = $stillFlagged($damagedCodes, ['damaged', 'decommissioned']);
                        if (empty($damagedCodes) || !empty($effectiveDamagedCodes)) {
                            $hasDamaged = true;
                            $reportedReservationBarcodes = array_merge($reportedReservationBarcodes, $effectiveDamagedCodes);
                        }
                    }

                    $hasViolation = $isPolicyViolation;
                    $hasLate = $isLate;

                    if (!$hasDamaged && !$hasLost && !$hasViolation && !$hasLate) {
                        continue;
                    }

                    $flaggedCodes = array_values(array_unique(array_merge($effectiveDamagedCodes, $effectiveLostCodes)));
                    $shownCodes = !empty($flaggedCodes) ? $flaggedCodes : $unitCodes;

                    // 1. Primary Classification & Badging
                    if ($hasDamaged) {
                        $primaryType = 'damaged';
                        $targetType = 'damaged_unit';
                        $priority = 'critical';
                    } elseif ($hasLost) {
                        $primaryType = 'lost';
                        $targetType = 'lost_unit';
                        $priority = 'critical';
                    } elseif ($hasViolation) {
                        $primaryType = 'policy_violation';
                        $targetType = 'policy_violation';
                        $priority = 'critical';
                    } else {
                        $primaryType = 'late_return';
                        $targetType = 'late_return';
                        $priority = 'high';
                    }

                    // 2. Cohesive Title
                    if ($hasDamaged && $hasViolation) {
                        $title = $isVenueInsp ? 'Venue Damage & Policy Violation' : 'Equipment Damage & Policy Violation';
                    } elseif ($hasDamaged && $hasLate) {
                        $title = $isVenueInsp ? 'Venue Damage & Late Turnover' : 'Damaged Unit & Late Return';
                    } elseif ($hasDamaged) {
                        $title = $isVenueInsp ? 'Venue Property Damage Alert' : 'Damaged Equipment Alert';
                    } elseif ($hasLost) {
                        $title = 'Lost Equipment Incident';
                    } elseif ($hasViolation && $hasLate) {
                        $title = $isVenueInsp ? 'Venue Policy Violation & Late Turnover' : 'Equipment Policy Violation & Late Return';
                    } elseif ($hasViolation) {
                        $title = $isVenueInsp ? 'Venue Booking Policy Violation' : 'Equipment Policy Violation';
                    } else {
                        $title = $isVenueInsp ? 'Late Venue Turnover' : 'Late Equipment Return';
                    }

                    // 3. Consolidated Message Narrative
                    $msgParts = [];
                    if ($hasDamaged) {
                        $msgParts[] = (!empty($effectiveDamagedCodes) ? 'Unit ' . implode(', ', $effectiveDamagedCodes) : 'Equipment unit') . ' damaged';
                    }
                    if ($hasLost) {
                        $msgParts[] = (!empty($effectiveLostCodes) ? 'Unit ' . implode(', ', $effectiveLostCodes) : 'Equipment unit') . ' reported lost';
                    }
                    if ($hasLate) {
                        $mins = (int) ($ins->minutes_late ?? 0);
                        $msgParts[] = $mins > 0 ? "returned {$mins} min late" : 'returned late';
                    }
                    if ($hasViolation) {
                        $msgParts[] = 'violation: ' . implode(', ', $violationCategories);
                    }

                    $combinedSummary = implode('; ', $msgParts) . " for {$refCode} by {$personName} ({$personOffice})";

                    // Single unified notification per inspection transaction
                    $key = 'general-insp-' . $ins->id;
                    $notifs->push($base + [
                        'id'                => $key,
                        'target_type'       => $targetType,
                        'incident_type'     => $primaryType,
                        'title'             => $title,
                        'message'           => $combinedSummary,
                        'item_name'         => !empty($shownCodes) ? implode(', ', $shownCodes) : $itemName,
                        'barcode'           => $shownCodes[0] ?? null,
                        'unit_code'         => !empty($shownCodes) ? implode(', ', $shownCodes) : 'N/A',
                        'violation_details' => implode(', ', $violationCategories),
                        'is_late'           => $hasLate,
                        'minutes_late'      => (int) ($ins->minutes_late ?? 0),
                        'has_damaged'       => $hasDamaged,
                        'has_lost'          => $hasLost,
                        'has_violation'     => $hasViolation,
                        'notes'             => $ins->notes ?: $combinedSummary,
                        'evidence_photo'    => $ins->evidence_photo ?? null,
                        'priority'          => $priority,
                        'is_read'           => $checkIsRead($key, $rawDate),
                    ]);
                }
            }

            // 2. Physical Equipment Units Catalog (Units Marked Lost or Damaged in Inventory)
            if (Schema::hasTable('equipment_units') && Schema::hasTable('equipment_types')) {
                $flaggedUnits = DB::table('equipment_units')
                    ->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                    ->where(function ($q) {
                        $q->whereIn(DB::raw('LOWER(equipment_units.status)'), ['damaged', 'lost', 'decommissioned'])
                          ->orWhereIn(DB::raw('LOWER(equipment_units.condition)'), ['damaged', 'lost']);
                    })
                    ->whereNull('equipment_units.archived_at')
                    ->select(
                        'equipment_units.*',
                        'equipment_types.eq_name'
                    )
                    ->orderByDesc('equipment_units.updated_at')
                    ->limit(25)
                    ->get();

                foreach ($flaggedUnits as $du) {
                    // Suppress duplicate: if this unit was already reported under an active reservation inspection above, do not spawn a duplicate inventory alert
                    if (in_array($du->barcode, $reportedReservationBarcodes)) {
                        continue;
                    }

                    $isUnitLost = strtolower($du->condition ?? '') === 'lost' || strtolower($du->status ?? '') === 'lost';
                    $key = 'general-unit-flag-' . $du->id;
                    $dt = Carbon::parse($du->updated_at ?? $du->created_at ?? now());
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'                => $key,
                        'target_id'         => $du->id,
                        'target_type'       => 'equipment_unit',
                        'incident_type'     => $isUnitLost ? 'lost' : 'damaged',
                        'title'             => $isUnitLost ? 'Physical Unit Lost in Inventory' : 'Physical Unit Damaged',
                        'message'           => "Barcode {$du->barcode} ({$du->eq_name}) condition is " . strtoupper($du->condition ?: $du->status),
                        'person_name'       => 'Equipment Custodian',
                        'person_contact'    => 'AVR Office',
                        'person_office'     => 'Resource Management',
                        'person_email'      => 'custodian@fsuu.edu.ph',
                        'item_name'         => "{$du->eq_name} ({$du->barcode})",
                        'barcode'           => $du->barcode,
                        'unit_code'         => $du->barcode,
                        'notes'             => $du->description ?: "Unit flagged as " . ($du->condition ?: $du->status),
                        'ref'               => $du->barcode,
                        'priority'          => 'critical',
                        'time'              => $formattedTime,
                        'rawDate'           => $du->updated_at ?? $du->created_at ?? now(),
                        'is_read'           => $checkIsRead($key, $du->updated_at ?? $du->created_at ?? now()),
                    ]);
                }
            }

            // 3. New Pending Venue Bookings
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $vbQuery = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending')
                    ->select(
                        'venue_bookings.*',
                        'venues.name as venue_name',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status'
                    )
                    ->orderByDesc('venue_bookings.created_at')
                    ->limit(15)
                    ->get();

                foreach ($vbQuery as $b) {
                    $ref = $b->reference_code ?? 'TRK-AVR';
                    $dt = Carbon::parse($b->created_at);
                    $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                    $key = 'notif-vb-pending-' . $b->id;

                    $notifs->push([
                        'id'             => $key,
                        'target_id'      => $b->id,
                        'target_type'    => 'venue_booking',
                        'incident_type'  => 'venue_booking',
                        'url'            => '/general/venue-bookings?id=' . $b->id . '&trk=' . $ref,
                        'type'           => 'pending_booking',
                        'priority'       => 'high',
                        'title'          => 'New Venue Booking',
                        'message'        => ($b->filer_name ?? 'Requestor') . ' submitted a booking for ' . ($b->venue_name ?? 'Facility') . " ({$ref})",
                        'person_name'    => $b->filer_name ?? 'Requestor',
                        'person_contact' => $b->contact_number ?? 'N/A',
                        'person_office'  => $b->program_office ?? 'Department',
                        'person_email'   => $b->email_address ?? 'N/A',
                        'item_name'      => $b->venue_name ?? 'Venue Facility',
                        'ref'            => $ref,
                        'time'           => $time,
                        'rawDate'        => $b->created_at,
                        'is_read'        => $checkIsRead($key, $b->created_at),
                    ]);
                }
            }

            // 4. New Pending Equipment Borrowings
            if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
                $ebQuery = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(DB::raw('LOWER(tracking_numbers.status)'), 'pending')
                    ->select(
                        'equipment_borrows.*',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status'
                    )
                    ->orderByDesc('equipment_borrows.created_at')
                    ->limit(15)
                    ->get();

                foreach ($ebQuery as $b) {
                    $ref = $b->reference_code ?? 'TRK-EQUIP';
                    $dt = Carbon::parse($b->created_at);
                    $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                    $key = 'notif-eb-pending-' . $b->id;

                    $notifs->push([
                        'id'             => $key,
                        'target_id'      => $b->id,
                        'target_type'    => 'equipment_borrow',
                        'incident_type'  => 'equipment_borrow',
                        'url'            => '/general/equipment-borrowing?id=' . $b->id . '&trk=' . $ref,
                        'type'           => 'pending_borrowing',
                        'priority'       => 'high',
                        'title'          => 'New Equipment Borrow Request',
                        'message'        => ($b->filer_name ?? 'Borrower') . ' requested equipment borrowing ' . "({$ref})",
                        'person_name'    => $b->filer_name ?? 'Borrower',
                        'person_contact' => $b->contact_number ?? 'N/A',
                        'person_office'  => $b->program_office ?? 'Department',
                        'person_email'   => $b->email_address ?? 'N/A',
                        'item_name'      => 'Equipment Requisition',
                        'ref'            => $ref,
                        'time'           => $time,
                        'rawDate'        => $b->created_at,
                        'is_read'        => $checkIsRead($key, $b->created_at),
                    ]);
                }
            }

            // 5. Student Assistant Requests (Category / Permission Requests)
            if (Schema::hasTable('category_requests')) {
                $catReqs = DB::table('category_requests')
                    ->leftJoin('users', 'category_requests.requested_by', '=', 'users.id')
                    ->where('category_requests.status', 'pending')
                    ->select('category_requests.*', 'users.name as requester_name', 'users.email_address as requester_email')
                    ->orderByDesc('category_requests.created_at')
                    ->limit(15)
                    ->get();

                foreach ($catReqs as $cr) {
                    $key = 'notif-catreq-' . $cr->id;
                    $dt = Carbon::parse($cr->created_at);
                    $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'             => $key,
                        'target_id'      => $cr->id,
                        'target_type'    => 'category_request',
                        'incident_type'  => 'request',
                        'url'            => '/sysad/settings?tab=system_settings',
                        'type'           => 'student_assistant_request',
                        'priority'       => 'medium',
                        'title'          => 'Student Assistant Category Request',
                        'message'        => ($cr->requester_name ?: 'Student Assistant') . ' requested new category: "' . $cr->proposed_name . '"',
                        'person_name'    => $cr->requester_name ?: 'Student Assistant',
                        'person_contact' => 'N/A',
                        'person_office'  => 'Student Assistant Portal',
                        'person_email'   => $cr->requester_email ?: 'N/A',
                        'item_name'      => $cr->proposed_name,
                        'ref'            => 'REQ-' . $cr->id,
                        'time'           => $time,
                        'rawDate'        => $cr->created_at,
                        'is_read'        => $checkIsRead($key, $cr->created_at),
                    ]);
                }
            }

            // 6. Upcoming Venue Booking Alerts (1 Day / 7 Hours before start if equipment units still unassigned)
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $now = Carbon::now();
                $upcomingVb = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['approved', 'pending'])
                    ->where('venue_bookings.date_of_usage', '>=', $now->toDateString())
                    ->where('venue_bookings.date_of_usage', '<=', $now->copy()->addDays(2)->toDateString())
                    ->select(
                        'venue_bookings.*',
                        'venues.name as venue_name',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status'
                    )
                    ->get();

                foreach ($upcomingVb as $b) {
                    $ref = $b->reference_code ?? 'TRK-AVR' . $b->id;
                    $startStr = ($b->date_of_usage ? Carbon::parse($b->date_of_usage)->toDateString() : $now->toDateString()) . ' ' . ($b->time_start ?: '08:00:00');
                    $startDt = Carbon::parse($startStr);
                    $hoursUntil = $now->diffInHours($startDt, false);

                    $assignedUnits = $b->assigned_units ? (is_string($b->assigned_units) ? json_decode($b->assigned_units, true) : $b->assigned_units) : null;
                    $hasUnassignedUnits = empty($assignedUnits);
                    $hasEquipmentRequested = !empty($b->equipment_notes);

                    if ($hasEquipmentRequested && $hasUnassignedUnits && $hoursUntil <= 24 && $hoursUntil >= 0) {
                        $key = 'notif-vb-unassigned-' . $b->id;
                        $timeUrgency = $hoursUntil <= 7 ? "in {$hoursUntil} hours" : "tomorrow";
                        $notifItemDate = $b->updated_at ?? $b->created_at ?? $now->toDateTimeString();
                        $notifs->push([
                            'id'             => $key,
                            'target_id'      => $b->id,
                            'target_type'    => 'venue_booking',
                            'incident_type'  => 'reminder',
                            'url'            => '/general/venue-bookings?id=' . $b->id . '&trk=' . $ref,
                            'type'           => 'unassigned_units_warning',
                            'priority'       => $hoursUntil <= 7 ? 'critical' : 'high',
                            'title'          => "Upcoming Venue Booking Alert — Units Unassigned ({$ref})",
                            'message'        => "Event at " . ($b->venue_name ?: 'Venue') . " starts {$timeUrgency} ({$b->date_of_usage}), but physical equipment units are STILL not assigned!",
                            'person_name'    => $b->filer_name ?? 'Requestor',
                            'person_contact' => $b->contact_number ?? 'N/A',
                            'person_office'  => $b->program_office ?? 'Department',
                            'person_email'   => $b->email_address ?? 'N/A',
                            'item_name'      => $b->venue_name ?? 'Venue Facility',
                            'ref'            => $ref,
                            'time'           => $hoursUntil <= 7 ? "{$hoursUntil}h left" : "1 day left",
                            'rawDate'        => $notifItemDate,
                            'is_read'        => $checkIsRead($key, $notifItemDate),
                        ]);
                    }
                }
            }

            // 7. Overdue Post-Inspection Reminders (Venue Bookings & Equipment Borrowings whose end time passed)
            $alreadyInspectedVbIds = [];
            $alreadyInspectedEbIds = [];
            if (Schema::hasTable('inspections')) {
                $alreadyInspectedVbIds = DB::table('inspections')
                    ->where(function ($q) {
                        $q->whereIn('inspectable_type', ['venue_booking', 'avr_venue_booking'])
                          ->orWhere('inspectable_type', 'like', '%VenueBooking%');
                    })
                    ->pluck('inspectable_id')->all();

                $alreadyInspectedEbIds = DB::table('inspections')
                    ->where(function ($q) {
                        $q->whereIn('inspectable_type', ['equipment_borrow', 'avr_equipment_borrowing'])
                          ->orWhere('inspectable_type', 'like', '%EquipmentBorrow%');
                    })
                    ->pluck('inspectable_id')->all();
            }

            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $now = Carbon::now();
                $overdueVbInsp = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['ongoing', 'on-going', 'approved'])
                    ->where('venue_bookings.date_of_usage', '<=', $now->toDateString())
                    ->select(
                        'venue_bookings.*',
                        'venues.name as venue_name',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status'
                    )
                    ->get();

                foreach ($overdueVbInsp as $b) {
                    if (in_array($b->id, $alreadyInspectedVbIds)) {
                        continue;
                    }
                    $ref = $b->reference_code ?? 'TRK-AVR' . $b->id;
                    $endStr = ($b->reservation_end_date ?: $b->date_of_usage ?: $now->toDateString()) . ' ' . ($b->time_end ?: '17:00:00');
                    $endDt = Carbon::parse($endStr);

                    if ($now->greaterThan($endDt)) {
                        $key = 'notif-vb-postinsp-overdue-' . $b->id;
                        $notifItemDate = $b->updated_at ?? $endDt->toDateTimeString();
                        $notifs->push([
                            'id'             => $key,
                            'target_id'      => $b->id,
                            'target_type'    => 'venue_booking',
                            'incident_type'  => 'reminder',
                            'url'            => '/general/venue-bookings?id=' . $b->id . '&trk=' . $ref . '&status=' . strtolower($b->tracking_status ?? 'approved'),
                            'type'           => 'overdue_post_inspection',
                            'priority'       => 'high',
                            'title'          => "Post-Event Inspection Needed ({$ref})",
                            'message'        => "Event at " . ($b->venue_name ?: 'Venue') . " ended on " . $endDt->format('M d, h:i A') . ". Post-event inspection has not been completed.",
                            'person_name'    => $b->filer_name ?? 'Requestor',
                            'person_contact' => $b->contact_number ?? 'N/A',
                            'person_office'  => $b->program_office ?? 'Department',
                            'person_email'   => $b->email_address ?? 'N/A',
                            'item_name'      => $b->venue_name ?? 'Venue Facility',
                            'ref'            => $ref,
                            'time'           => 'Needs Inspection',
                            'rawDate'        => $notifItemDate,
                            'is_read'        => $checkIsRead($key, $notifItemDate),
                        ]);
                    }
                }
            }

            if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
                $now = Carbon::now();
                $overdueEbInsp = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('equipment_borrows.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['ongoing', 'on-going', 'borrowed', 'approved'])
                    ->where('equipment_borrows.date_of_usage', '<=', $now->toDateString())
                    ->select(
                        'equipment_borrows.*',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status'
                    )
                    ->get();

                foreach ($overdueEbInsp as $b) {
                    if (in_array($b->id, $alreadyInspectedEbIds)) {
                        continue;
                    }
                    $ref = $b->reference_code ?? 'TRK-EB' . $b->id;
                    $endStr = ($b->date_of_usage ?: $now->toDateString()) . ' ' . ($b->time_end ?: '17:00:00');
                    $endDt = Carbon::parse($endStr);

                    if ($now->greaterThan($endDt)) {
                        $key = 'notif-eb-postinsp-overdue-' . $b->id;
                        $notifItemDate = $b->updated_at ?? $endDt->toDateTimeString();
                        $notifs->push([
                            'id'             => $key,
                            'target_id'      => $b->id,
                            'target_type'    => 'equipment_borrow',
                            'incident_type'  => 'reminder',
                            'url'            => '/general/equipment-borrowing?id=' . $b->id . '&trk=' . $ref . '&status=' . strtolower($b->tracking_status ?? 'approved'),
                            'type'           => 'overdue_post_inspection',
                            'priority'       => 'high',
                            'title'          => "Post-Equipment Return Inspection Needed ({$ref})",
                            'message'        => "Borrowing by {$b->filer_name} ({$b->program_office}) usage schedule ended on " . $endDt->format('M d, h:i A') . ". Check-in inspection is pending.",
                            'person_name'    => $b->filer_name ?? 'Borrower',
                            'person_contact' => $b->contact_number ?? 'N/A',
                            'person_office'  => $b->program_office ?? 'Department',
                            'person_email'   => $b->email_address ?? 'N/A',
                            'item_name'      => 'Borrowed Equipment Units',
                            'ref'            => $ref,
                            'time'           => 'Needs Inspection',
                            'rawDate'        => $notifItemDate,
                            'is_read'        => $checkIsRead($key, $notifItemDate),
                        ]);
                    }
                }
            }

            // 7. Urgent Approval requests escalated by Student Assistants / Staff
            if (Schema::hasTable('notifications')) {
                $urgentRows = DB::table('notifications')
                    ->where('type', 'urgent_approval')
                    ->orderByDesc('id')
                    ->limit(30)
                    ->get();

                foreach ($urgentRows as $ur) {
                    $ref = $ur->reference_code ?? ('URG-' . $ur->id);
                    $key = 'urgent-approval-' . ($ur->id ?? $ref);
                    $rawDate = $ur->created_at ?? now()->toDateTimeString();
                    $isVenue = str_starts_with($ref, 'TRK-AVR') || str_contains($ref, 'AVR');

                    $notifs->push([
                        'id'             => $key,
                        'target_id'      => $ur->id,
                        'target_type'    => $isVenue ? 'venue_booking' : 'equipment_borrow',
                        'incident_type'  => 'urgent',
                        'url'            => $isVenue ? ('/general/venue-booking?trk=' . $ref) : ('/general/equipment-borrowing?trk=' . $ref),
                        'type'           => 'urgent_approval',
                        'priority'       => 'urgent',
                        'title'          => "Urgent Approval with ({$ref})",
                        'message'        => $ur->message ?? $ur->text ?? "Urgent approval requested for booking {$ref}.",
                        'person_name'    => 'Requestor',
                        'ref'            => $ref,
                        'time'           => 'Urgent Approval',
                        'rawDate'        => $rawDate,
                        'is_read'        => $checkIsRead($key, $rawDate),
                    ]);
                }
            }

            // One-Notification-Per-Transaction Guarantee:
            // Ensure at most ONE consolidated notification per transaction reference code (e.g. VB-2026-..., EQ-2026-...).
            // If multiple notifications share the same reference, retain the one with higher severity/priority.
            $priorityWeights = [
                'critical' => 5,
                'urgent'   => 4,
                'high'     => 3,
                'medium'   => 2,
                'low'      => 1,
                'info'     => 1,
            ];

            $dedupedByRef = [];
            foreach ($notifs as $n) {
                $ref = trim((string)($n['ref'] ?? ''));
                if ($ref === '' || $ref === 'N/A') {
                    $dedupedByRef[] = $n;
                    continue;
                }
                if (!isset($dedupedByRef[$ref])) {
                    $dedupedByRef[$ref] = $n;
                } else {
                    $existingWeight = $priorityWeights[$dedupedByRef[$ref]['priority'] ?? 'medium'] ?? 2;
                    $currentWeight  = $priorityWeights[$n['priority'] ?? 'medium'] ?? 2;
                    if ($currentWeight > $existingWeight) {
                        $dedupedByRef[$ref] = $n;
                    }
                }
            }
            $sorted = collect(array_values($dedupedByRef))->sortByDesc('rawDate')->values();

            // Persist notifications into database table
            if (Schema::hasTable('notifications')) {
                foreach ($sorted as $n) {
                    try {
                        DB::table('notifications')->updateOrInsert(
                            [
                                'reference_code' => $n['ref'] ?? $n['id'],
                                'title'          => $n['title'] ?? 'Notification',
                            ],
                            [
                                'user_id'        => $userId,
                                'target_role'    => 'staff',
                                'type'           => $n['type'] ?? 'info',
                                'priority'       => $n['priority'] ?? 'medium',
                                'text'           => $n['message'] ?? $n['title'] ?? '',
                                'action_url'     => $n['url'] ?? null,
                                'metadata'       => json_encode($n),
                                'read_at'        => !empty($n['is_read']) ? now() : null,
                                'created_at'     => $n['rawDate'] ?? now(),
                                'updated_at'     => now(),
                            ]
                        );
                    } catch (\Throwable $t) {}
                }
            }

            return response()->json($sorted);
        } catch (\Throwable $e) {
            Log::error('General NotificationController error: ' . $e->getMessage());
            return response()->json([]);
        }
    }

    public function markAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user ? $user->id : null;
        $key = $request->input('notification_id') ?? $request->input('id');

        if ($key) {
            DB::table('notification_reads')->updateOrInsert(
                ['notification_key' => $key, 'user_id' => $userId],
                ['read_at' => now(), 'updated_at' => now(), 'created_at' => now()]
            );

            if (Schema::hasTable('notifications')) {
                DB::table('notifications')
                    ->where('reference_code', $key)
                    ->orWhere('id', is_numeric($key) ? (int)$key : 0)
                    ->update(['read_at' => now()]);
            }
        }

        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user ? $user->id : null;
        $keys = $request->input('notification_ids', []);

        if (empty($keys)) {
            $all = $this->index($request)->getData(true);
            $keys = array_column($all, 'id');
        }

        $now = now();
        foreach ($keys as $k) {
            if ($k) {
                DB::table('notification_reads')->updateOrInsert(
                    ['notification_key' => $k, 'user_id' => $userId],
                    ['read_at' => $now, 'updated_at' => $now, 'created_at' => $now]
                );
            }
        }

        // Global watermark for this user:
        if ($userId) {
            DB::table('notification_reads')->updateOrInsert(
                ['notification_key' => '__ALL_READ__', 'user_id' => $userId],
                ['read_at' => $now, 'updated_at' => $now, 'created_at' => $now]
            );
        }

        if (Schema::hasTable('notifications')) {
            DB::table('notifications')
                ->where('user_id', $userId)
                ->update(['read_at' => $now]);
        }

        return response()->json(['success' => true, 'marked_count' => count($keys)]);
    }
}
