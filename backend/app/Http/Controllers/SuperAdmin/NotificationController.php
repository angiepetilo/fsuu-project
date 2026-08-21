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

            // 1. Damaged and Lost Physical Units from Inspections
            if (Schema::hasTable('inspections')) {
                $inspections = DB::table('inspections')
                    ->whereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'missing'])
                    ->orWhereNotNull('violation_type')
                    ->orWhere('is_late', true)
                    ->orderByDesc('created_at')
                    ->limit(50)
                    ->get();

                foreach ($inspections as $ins) {
                    $condition = strtolower($ins->condition ?? 'good');
                    $isDamaged = $condition === 'damaged';
                    $isLost = in_array($condition, ['lost', 'missing']);
                    $hasViolation = !empty($ins->violation_type) || $ins->is_late;

                    // Determine parent record details (Equipment Borrow or Venue Booking)
                    $personName = 'Borrower / Requestor';
                    $personContact = 'N/A';
                    $personOffice = 'FSUU Department';
                    $personEmail = 'N/A';
                    $refCode = 'TRK-INCIDENT';
                    $officeName = 'Main Campus';
                    $itemName = 'Physical Unit';
                    $unitCodes = [];

                    if (!empty($ins->assigned_units)) {
                        $decodedUnits = json_decode($ins->assigned_units, true);
                        if (is_array($decodedUnits)) {
                            $unitCodes = $decodedUnits;
                        }
                    }

                    // Check if parent is Equipment Borrow
                    if ($ins->inspectable_type === 'equipment_borrow' || $ins->reference_type === 'equipment_borrow' || str_contains($ins->inspectable_type ?? '', 'EquipmentBorrow')) {
                        $borrowId = $ins->inspectable_id ?: $ins->reference_id;
                        $borrow = DB::table('equipment_borrows')
                            ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                            ->leftJoin('offices', 'equipment_borrows.office_id', '=', 'offices.id')
                            ->where('equipment_borrows.id', $borrowId)
                            ->select(
                                'equipment_borrows.*',
                                'tracking_numbers.reference_code',
                                'offices.name as office_name'
                            )
                            ->first();

                        if ($borrow) {
                            $personName = $borrow->filer_name ?? 'Borrower';
                            $personContact = $borrow->contact_number ?? 'N/A';
                            $personOffice = $borrow->program_office ?? 'Department';
                            $personEmail = $borrow->email_address ?? 'N/A';
                            $refCode = $borrow->reference_code ?? 'TRK-BORROW';
                            $officeName = $borrow->office_name ?? 'AVR Office';
                        }
                    } elseif ($ins->inspectable_type === 'venue_booking' || $ins->reference_type === 'venue_booking' || str_contains($ins->inspectable_type ?? '', 'VenueBooking')) {
                        $bookingId = $ins->inspectable_id ?: $ins->reference_id;
                        $booking = DB::table('venue_bookings')
                            ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                            ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
                            ->where('venue_bookings.id', $bookingId)
                            ->select(
                                'venue_bookings.*',
                                'venues.name as venue_name',
                                'tracking_numbers.reference_code',
                                'offices.name as office_name'
                            )
                            ->first();

                        if ($booking) {
                            $personName = $booking->filer_name ?? 'Requestor';
                            $personContact = $booking->contact_number ?? 'N/A';
                            $personOffice = $booking->program_office ?? 'Department';
                            $personEmail = $booking->email_address ?? 'N/A';
                            $refCode = $booking->reference_code ?? 'TRK-VENUE';
                            $officeName = $booking->office_name ?? 'AVR Office';
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
                            'title'             => 'Damaged Physical Unit',
                            'message'           => "Physical unit reported damaged during inspection by {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical equipment unit returned with damage.',
                            'evidence_photo'    => $ins->evidence_photo ?? null,
                            'ref'               => $refCode,
                            'office'            => $officeName,
                            'priority'          => 'high',
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
                            'title'             => 'Lost Physical Unit',
                            'message'           => "Physical unit reported missing / lost by {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical equipment unit not returned / marked lost.',
                            'evidence_photo'    => null,
                            'ref'               => $refCode,
                            'office'            => $officeName,
                            'priority'          => 'high',
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
                            'title'             => 'Policy Violation Incident',
                            'message'           => "{$violationTitle} recorded for {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'violation_details' => $violationTitle,
                            'notes'             => $ins->notes ?: "Violation: {$violationTitle}",
                            'evidence_photo'    => $ins->evidence_photo ?? null,
                            'ref'               => $refCode,
                            'office'            => $officeName,
                            'priority'          => 'high',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }
                }
            }

            // 2. Physical Equipment Units marked Damaged or Lost directly
            if (Schema::hasTable('equipment_units')) {
                $damagedDirectUnits = DB::table('equipment_units')
                    ->join('equipment_types', 'equipment_units.equipment_type_id', '=', 'equipment_types.id')
                    ->leftJoin('offices', 'equipment_types.office_id', '=', 'offices.id')
                    ->whereIn('equipment_units.status', ['damaged', 'lost', 'under_maintenance'])
                    ->orWhereIn(DB::raw('LOWER(equipment_units.condition)'), ['damaged', 'lost'])
                    ->select(
                        'equipment_units.*',
                        'equipment_types.name as equipment_name',
                        'offices.name as office_name'
                    )
                    ->orderByDesc('equipment_units.updated_at')
                    ->limit(20)
                    ->get();

                foreach ($damagedDirectUnits as $du) {
                    $cond = strtolower($du->status ?? $du->condition ?? 'damaged');
                    $isLost = $cond === 'lost';
                    $incidentType = $isLost ? 'lost' : 'damaged';
                    $key = 'sysad-unit-' . $du->id . '-' . $incidentType;

                    // Avoid duplicate if already covered
                    if ($notifs->contains('id', $key)) continue;

                    $dt = Carbon::parse($du->updated_at ?? $du->created_at ?? now());
                    $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'                => $key,
                        'target_id'         => $du->id,
                        'target_type'       => $isLost ? 'lost_unit' : 'damaged_unit',
                        'incident_type'     => $incidentType,
                        'title'             => $isLost ? 'Lost Physical Unit' : 'Damaged Physical Unit',
                        'message'           => "{$du->equipment_name} (Unit: " . ($du->unit_code ?: $du->barcode ?: '#' . $du->id) . ") is currently marked {$cond}",
                        'person_name'       => 'Inventory Custodian',
                        'person_contact'    => 'AVR Office',
                        'person_office'     => $du->office_name ?? 'Main Campus',
                        'person_email'      => 'custodian@fsuu.edu.ph',
                        'item_name'         => $du->equipment_name,
                        'unit_code'         => $du->unit_code ?: $du->barcode ?: '#' . $du->id,
                        'notes'             => $du->notes ?: ($isLost ? 'Physical unit marked missing/lost.' : 'Equipment unit requires maintenance/repair.'),
                        'evidence_photo'    => null,
                        'ref'               => 'INV-' . ($du->unit_code ?: $du->id),
                        'office'            => $du->office_name ?? 'Main Campus',
                        'priority'          => 'high',
                        'time'              => $time,
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
