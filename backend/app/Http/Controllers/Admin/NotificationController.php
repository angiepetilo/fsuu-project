<?php

namespace App\Http\Controllers\Admin;

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
            if (Schema::hasTable('notification_reads')) {
                $readKeys = DB::table('notification_reads')
                    ->where('user_id', $userId)
                    ->pluck('notification_key')
                    ->flip()
                    ->toArray();
            }

            $notifs = collect();

            // 1. Critical Inspection Incidents (Equipment Lost, Equipment Damaged, Venue Booking Policy Violations)
            if (Schema::hasTable('inspections')) {
                $inspections = DB::table('inspections')
                    ->orderByDesc('id')
                    ->limit(50)
                    ->get();

                foreach ($inspections as $ins) {
                    $condition = strtolower($ins->condition ?? 'good');
                    $isDamaged = $condition === 'damaged' || str_contains(strtolower($ins->violation_type ?? ''), 'damage');
                    $isLost = in_array($condition, ['lost', 'missing']) || str_contains(strtolower($ins->violation_type ?? ''), 'lost');
                    $isLate = (bool)($ins->is_late ?? false) || strtolower($ins->timeliness ?? '') === 'late' || str_contains(strtolower($ins->violation_type ?? ''), 'late');
                    $hasViolation = !empty($ins->violation_type) || $isLate;

                    // Inspect unit_conditions for granular unit-level lost/damaged flags
                    $rawUnitConds = $ins->unit_conditions ?? null;
                    if (is_string($rawUnitConds)) {
                        $rawUnitConds = json_decode($rawUnitConds, true);
                    }
                    if (is_array($rawUnitConds)) {
                        foreach ($rawUnitConds as $uKey => $cVal) {
                            $cStr = strtolower(is_array($cVal) ? ($cVal['condition'] ?? $cVal['status'] ?? '') : (string)$cVal);
                            if ($cStr === 'lost') $isLost = true;
                            if ($cStr === 'damaged') $isDamaged = true;
                        }
                    }

                    if (!$isDamaged && !$isLost && !$hasViolation) {
                        continue;
                    }

                    $personName = 'Borrower / Requestor';
                    $personContact = 'N/A';
                    $personOffice = 'FSUU Department';
                    $personEmail = 'N/A';
                    $refCode = 'TRK-INCIDENT';
                    $itemName = 'Physical Unit / Facility';
                    $unitCodes = [];

                    if (!empty($ins->assigned_units)) {
                        $decodedUnits = is_string($ins->assigned_units) ? json_decode($ins->assigned_units, true) : $ins->assigned_units;
                        if (is_array($decodedUnits)) {
                            $unitCodes = array_values(array_filter($decodedUnits));
                        }
                    }

                    $isVenueInsp = in_array(strtolower($ins->inspectable_type ?? ''), ['venue_booking', 'avr_venue_booking']) || str_contains($ins->inspectable_type ?? '', 'VenueBooking');
                    $isEquipInsp = in_array(strtolower($ins->inspectable_type ?? ''), ['equipment_borrow', 'avr_equipment_borrowing']) || str_contains($ins->inspectable_type ?? '', 'EquipmentBorrow');

                    if ($isEquipInsp && Schema::hasTable('equipment_borrows')) {
                        $borrowId = $ins->inspectable_id;
                        $borrow = DB::table('equipment_borrows')
                            ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                            ->where('equipment_borrows.id', $borrowId)
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
                        $bookingId = $ins->inspectable_id;
                        $booking = DB::table('venue_bookings')
                            ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                            ->where('venue_bookings.id', $bookingId)
                            ->select('venue_bookings.*', 'venues.name as venue_name', 'tracking_numbers.reference_code')
                            ->first();

                        if ($booking) {
                            $personName = $booking->filer_name ?? 'Requestor';
                            $personContact = $booking->contact_number ?? 'N/A';
                            $personOffice = $booking->program_office ?? 'Department';
                            $personEmail = $booking->email_address ?? 'N/A';
                            $refCode = $booking->reference_code ?? 'TRK-VENUE';
                            $itemName = $booking->venue_name ?? 'Venue Facility';
                        }
                    }

                    $rawDate = $ins->inspected_at ?? $ins->created_at ?? now();
                    $dt = Carbon::parse($rawDate);
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    // 1a. Lost Equipment Notification
                    if ($isLost) {
                        $key = 'admin-lost-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'lost_unit',
                            'incident_type'     => 'lost',
                            'title'             => 'Lost Equipment Incident',
                            'message'           => "Equipment unit reported LOST for transaction {$refCode} by {$personName} ({$personOffice})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical equipment unit not returned / marked lost.',
                            'ref'               => $refCode,
                            'priority'          => 'critical',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }

                    // 1b. Damaged Equipment Notification
                    if ($isDamaged) {
                        $key = 'admin-dmg-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'damaged_unit',
                            'incident_type'     => 'damaged',
                            'title'             => 'Damaged Equipment Alert',
                            'message'           => "Equipment unit damaged during reservation {$refCode} by {$personName} ({$personOffice})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical unit reported damaged upon post-inspection.',
                            'evidence_photo'    => $ins->evidence_photo ?? null,
                            'ref'               => $refCode,
                            'priority'          => 'critical',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }

                    // 1c. Venue Booking Policy Violation Notification
                    if ($hasViolation) {
                        $violationTitle = $ins->violation_type ?: ($isLate ? "Late Return ({$ins->minutes_late} mins)" : 'Policy Violation');
                        $key = 'admin-viol-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'policy_violation',
                            'incident_type'     => 'policy_violation',
                            'title'             => $isVenueInsp ? 'Venue Booking Policy Violation' : 'Equipment Policy Violation',
                            'message'           => "{$violationTitle} recorded for {$personName} ({$personOffice}) on {$refCode}",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'violation_details' => $violationTitle,
                            'notes'             => $ins->notes ?: "Violation logged: {$violationTitle}",
                            'ref'               => $refCode,
                            'priority'          => 'critical',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }
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
                    $isUnitLost = strtolower($du->condition ?? '') === 'lost' || strtolower($du->status ?? '') === 'lost';
                    $key = 'admin-unit-flag-' . $du->id;
                    $dt = Carbon::parse($du->updated_at ?? $du->created_at ?? now());
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'                => $key,
                        'target_id'         => $du->id,
                        'target_type'       => 'equipment_unit',
                        'incident_type'     => $isUnitLost ? 'lost' : 'damaged',
                        'title'             => $isUnitLost ? 'Physical Unit Lost in Inventory' : 'Physical Unit Damaged',
                        'message'           => "Barcode {$du->unit_code} ({$du->eq_name}) condition is " . strtoupper($du->condition ?: $du->status),
                        'person_name'       => 'Equipment Custodian',
                        'person_contact'    => 'AVR Office',
                        'person_office'     => 'Resource Management',
                        'person_email'      => 'custodian@fsuu.edu.ph',
                        'item_name'         => "{$du->eq_name} ({$du->unit_code})",
                        'unit_code'         => $du->unit_code,
                        'notes'             => $du->description ?: "Unit flagged as " . ($du->condition ?: $du->status),
                        'ref'               => $du->unit_code,
                        'priority'          => 'critical',
                        'time'              => $formattedTime,
                        'rawDate'           => $du->updated_at ?? $du->created_at ?? now(),
                        'is_read'           => isset($readKeys[$key]),
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
                        'url'            => '/admin/venue-bookings?id=' . $b->id . '&trk=' . $ref,
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
                        'is_read'        => isset($readKeys[$key]),
                    ]);
                }
            }

            $sorted = $notifs->sortByDesc('rawDate')->values();

            return response()->json($sorted);
        } catch (\Throwable $e) {
            Log::error('Admin NotificationController error: ' . $e->getMessage());
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

        foreach ($keys as $k) {
            if ($k) {
                DB::table('notification_reads')->updateOrInsert(
                    ['notification_key' => $k, 'user_id' => $userId],
                    ['read_at' => now(), 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }

        return response()->json(['success' => true, 'marked_count' => count($keys)]);
    }
}
