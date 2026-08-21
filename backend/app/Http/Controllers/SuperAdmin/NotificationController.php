<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificationController extends Controller
{
    /**
     * Return unified global notifications feed for SuperAdmin.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user ? $user->id : null;

            $readKeys = DB::table('notification_reads')
                ->where('user_id', $userId)
                ->pluck('notification_key')
                ->flip();

            $notifs = collect();

            // 1. Critical Inspection Incidents (Damages, Lost Gear, Violations)
            if (Schema::hasTable('inspections')) {
                $inspections = DB::table('inspections')
                    ->whereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'missing'])
                    ->orWhereNotNull('violation_type')
                    ->orWhere('is_late', true)
                    ->orderByDesc('created_at')
                    ->limit(25)
                    ->get();

                foreach ($inspections as $ins) {
                    $condition = strtolower($ins->condition ?? 'good');
                    $isDamaged = $condition === 'damaged';
                    $isLost = in_array($condition, ['lost', 'missing']);
                    $hasViolation = !empty($ins->violation_type) || $ins->is_late;

                    $personName = 'Borrower / Requestor';
                    $personContact = 'N/A';
                    $personOffice = 'FSUU Department';
                    $personEmail = 'N/A';
                    $refCode = 'TRK-INCIDENT';
                    $itemName = 'Physical Unit';
                    $unitCodes = [];

                    if (!empty($ins->assigned_units)) {
                        $decodedUnits = json_decode($ins->assigned_units, true);
                        if (is_array($decodedUnits)) {
                            $unitCodes = $decodedUnits;
                        }
                    }

                    if ($ins->inspectable_type === 'equipment_borrow' || $ins->reference_type === 'equipment_borrow' || str_contains($ins->inspectable_type ?? '', 'EquipmentBorrow')) {
                        $borrowId = $ins->inspectable_id ?: $ins->reference_id;
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
                        }
                    } elseif ($ins->inspectable_type === 'venue_booking' || $ins->reference_type === 'venue_booking' || str_contains($ins->inspectable_type ?? '', 'VenueBooking')) {
                        $bookingId = $ins->inspectable_id ?: $ins->reference_id;
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

                    if ($isDamaged) {
                        $key = 'sysad-dmg-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'damaged_unit',
                            'incident_type'     => 'damaged',
                            'title'             => 'Damaged Equipment Alert',
                            'message'           => "Unit damaged during reservation by {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical unit reported damaged upon return.',
                            'evidence_photo'    => $ins->evidence_photo ?? null,
                            'ref'               => $refCode,
                            'priority'          => 'critical',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    } elseif ($isLost) {
                        $key = 'sysad-lost-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'lost_unit',
                            'incident_type'     => 'lost',
                            'title'             => 'Lost Equipment Alert',
                            'message'           => "Unit reported lost/unreturned by {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Unit not returned and marked missing/lost.',
                            'ref'               => $refCode,
                            'priority'          => 'critical',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }

                    if ($hasViolation) {
                        $violationTitle = $ins->violation_type ?: ($ins->is_late ? "Late Return ({$ins->minutes_late} mins)" : 'Policy Violation');
                        $key = 'sysad-viol-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'policy_violation',
                            'incident_type'     => 'policy_violation',
                            'title'             => 'Campus Policy Breach',
                            'message'           => "{$violationTitle} breach logged for {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'violation_details' => $violationTitle,
                            'notes'             => $ins->notes ?: "Breach: {$violationTitle}",
                            'ref'               => $refCode,
                            'priority'          => 'high',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }
                }
            }

            // 2. Decommissioned / Damaged Physical Units Catalog Check
            if (Schema::hasTable('equipment_units') && Schema::hasTable('equipment_types')) {
                $damagedUnits = DB::table('equipment_units')
                    ->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                    ->where(function ($q) {
                        $q->whereIn(DB::raw('LOWER(equipment_units.status)'), ['damaged', 'unavailable', 'decommissioned', 'lost'])
                          ->orWhereIn(DB::raw('LOWER(equipment_units.`condition`)'), ['damaged', 'lost']);
                    })
                    ->whereNull('equipment_units.archived_at')
                    ->select(
                        'equipment_units.*',
                        'equipment_types.eq_name'
                    )
                    ->orderByDesc('equipment_units.updated_at')
                    ->limit(20)
                    ->get();

                foreach ($damagedUnits as $du) {
                    $key = 'sysad-unit-dmg-' . $du->id;
                    $dt = Carbon::parse($du->updated_at ?? $du->created_at);
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'                => $key,
                        'target_id'         => $du->id,
                        'target_type'       => 'equipment_unit',
                        'incident_type'     => strtolower($du->condition ?? '') === 'lost' ? 'lost' : 'damaged',
                        'title'             => 'Inventory Unit Flagged (' . ($du->condition ?: $du->status) . ')',
                        'message'           => "Barcode {$du->unit_code} ({$du->eq_name}) marked as {$du->status}",
                        'person_name'       => 'Facility Custodian',
                        'person_contact'    => 'AVR Resource Center',
                        'person_office'     => 'Main Campus',
                        'person_email'      => 'custodian@fsuu.edu.ph',
                        'item_name'         => "{$du->eq_name} ({$du->unit_code})",
                        'unit_code'         => $du->unit_code,
                        'notes'             => $du->description ?: "Unit flagged with condition {$du->condition}",
                        'ref'               => $du->unit_code,
                        'priority'          => 'medium',
                        'time'              => $formattedTime,
                        'rawDate'           => $du->updated_at ?? $du->created_at,
                        'is_read'           => isset($readKeys[$key]),
                    ]);
                }
            }

            $sorted = $notifs->sortByDesc('rawDate')->values();

            return response()->json($sorted);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('SuperAdmin NotificationController error: ' . $e->getMessage());
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
