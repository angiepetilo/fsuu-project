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
                    ->whereIn(DB::raw('LOWER(condition)'), ['damaged', 'lost', 'missing'])
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
                          ->orWhereIn(DB::raw('LOWER(equipment_units.condition)'), ['damaged', 'lost']);
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

            // 3. Cancelled & Rejected Bookings Across All Departments
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $cancelledVenues = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['cancelled', 'rejected', 'cancelled_by_user'])
                    ->select(
                        'venue_bookings.*',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status',
                        'venues.name as venue_name'
                    )
                    ->orderByDesc('venue_bookings.updated_at')
                    ->limit(20)
                    ->get();

                foreach ($cancelledVenues as $cv) {
                    $key = 'sysad-cnl-vb-' . $cv->id;
                    $rawDate = $cv->updated_at ?? $cv->created_at ?? now();
                    $dt = Carbon::parse($rawDate);
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'             => $key,
                        'target_id'      => $cv->id,
                        'target_type'    => 'venue_booking',
                        'incident_type'  => 'cancelled',
                        'title'          => 'Venue Booking Cancelled',
                        'message'        => ($cv->filer_name ?? 'Requestor') . ' cancelled booking for ' . ($cv->venue_name ?? 'Facility') . " ({$cv->reference_code})",
                        'person_name'    => $cv->filer_name ?? 'Requestor',
                        'person_contact' => $cv->contact_number ?? 'N/A',
                        'person_office'  => $cv->program_office ?? 'Department',
                        'person_email'   => $cv->email_address ?? 'N/A',
                        'item_name'      => $cv->venue_name ?? 'AVR Facility',
                        'unit_code'      => 'N/A',
                        'notes'          => $cv->rejection_reason ?: ($cv->cancellation_reason ?: 'Venue booking was cancelled.'),
                        'ref'            => $cv->reference_code,
                        'priority'       => 'medium',
                        'time'           => $formattedTime,
                        'rawDate'        => $rawDate,
                        'is_read'        => isset($readKeys[$key]),
                    ]);
                }
            }

            if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
                $cancelledBorrows = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['cancelled', 'rejected', 'cancelled_by_user'])
                    ->select(
                        'equipment_borrows.*',
                        'tracking_numbers.reference_code',
                        'tracking_numbers.status as tracking_status'
                    )
                    ->orderByDesc('equipment_borrows.updated_at')
                    ->limit(20)
                    ->get();

                foreach ($cancelledBorrows as $cb) {
                    $key = 'sysad-cnl-eb-' . $cb->id;
                    $rawDate = $cb->updated_at ?? $cb->created_at ?? now();
                    $dt = Carbon::parse($rawDate);
                    $formattedTime = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');

                    $notifs->push([
                        'id'             => $key,
                        'target_id'      => $cb->id,
                        'target_type'    => 'equipment_borrow',
                        'incident_type'  => 'cancelled',
                        'title'          => 'Equipment Borrow Cancelled',
                        'message'        => ($cb->filer_name ?? 'Borrower') . " cancelled borrow request ({$cb->reference_code})",
                        'person_name'    => $cb->filer_name ?? 'Borrower',
                        'person_contact' => $cb->contact_number ?? 'N/A',
                        'person_office'  => $cb->program_office ?? 'Department',
                        'person_email'   => $cb->email_address ?? 'N/A',
                        'item_name'      => $cb->equipment_notes ?? 'Borrow Request',
                        'unit_code'      => 'N/A',
                        'notes'          => $cb->rejection_reason ?: ($cb->cancellation_reason ?: 'Equipment borrow request was cancelled.'),
                        'ref'            => $cb->reference_code,
                        'priority'       => 'medium',
                        'time'           => $formattedTime,
                        'rawDate'        => $rawDate,
                        'is_read'        => isset($readKeys[$key]),
                    ]);
                }
            }

            // 5. Proactive Upcoming Equipment Shortage Sentinel
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('equipment_types')) {
                $today = now()->toDateString();
                $upcomingBookings = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                    ->whereIn('tracking_numbers.status', ['pending', 'approved'])
                    ->where('venue_bookings.date_of_usage', '>=', $today)
                    ->whereNotNull('venue_bookings.equipment_notes')
                    ->where('venue_bookings.equipment_notes', '!=', '')
                    ->whereNull('venue_bookings.archived_at')
                    ->select('venue_bookings.*', 'venues.name as venue_name', 'tracking_numbers.reference_code')
                    ->orderBy('venue_bookings.date_of_usage')
                    ->limit(20)
                    ->get();

                $allTypes = DB::table('equipment_types')->whereNull('archived_at')->get();
                $damagedOrOutUnitCounts = DB::table('equipment_units')
                    ->whereNull('archived_at')
                    ->whereIn(DB::raw('LOWER(status)'), ['damaged', 'lost', 'decommissioned', 'maintenance', 'released'])
                    ->select('equipment_type_id', DB::raw('COUNT(*) as unavailable_count'))
                    ->groupBy('equipment_type_id')
                    ->pluck('unavailable_count', 'equipment_type_id');

                $operationalCounts = DB::table('equipment_units')
                    ->whereNull('archived_at')
                    ->where('status', 'available')
                    ->whereNotIn(DB::raw('LOWER(condition)'), ['damaged', 'lost', 'under repair'])
                    ->select('equipment_type_id', DB::raw('COUNT(*) as on_hand_good'))
                    ->groupBy('equipment_type_id')
                    ->pluck('on_hand_good', 'equipment_type_id');

                foreach ($upcomingBookings as $ub) {
                    $eqNotes = strtoupper($ub->equipment_notes);
                    foreach ($allTypes as $et) {
                        $tName = strtoupper($et->name ?? $et->eq_name ?? '');
                        if (!$tName || !str_contains($eqNotes, $tName)) continue;

                        $qtyNeeded = 1;
                        if (preg_match('/\b' . preg_quote($tName, '/') . '\s*\(Qty:\s*(\d+)\)/i', $eqNotes, $qm)) {
                            $qtyNeeded = (int)$qm[1];
                        }

                        $onHand = (int)($operationalCounts[$et->id] ?? 0);
                        $unavailable = (int)($damagedOrOutUnitCounts[$et->id] ?? 0);

                        if ($unavailable > 0 && $onHand < $qtyNeeded) {
                            $key = 'sysad-shortage-alert-vb-' . $ub->id . '-' . $et->id;
                            $refCode = $ub->reference_code ?? ('TRK-AVR' . $ub->id);
                            $usageDt = Carbon::parse($ub->date_of_usage)->format('M d, Y');

                            $notifs->push([
                                'id'             => $key,
                                'target_id'      => $ub->id,
                                'target_type'    => 'venue_booking',
                                'incident_type'  => 'stock_shortage',
                                'url'            => '/sysad/venue-bookings?id=' . $ub->id . '&trk=' . $refCode,
                                'type'           => 'stock_shortage_alert',
                                'priority'       => 'high',
                                'title'          => 'Stock Shortage Warning',
                                'message'        => "Damage/unreturned {$et->name} units affects upcoming booking {$refCode} on {$usageDt} (Needed: {$qtyNeeded}, Ready: {$onHand}).",
                                'person_name'    => $ub->filer_name ?? 'Filer',
                                'person_contact' => $ub->contact_number ?? 'N/A',
                                'person_office'  => $ub->program_office ?? 'Department',
                                'person_email'   => $ub->email_address ?? 'N/A',
                                'item_name'      => $et->name ?? 'Equipment',
                                'ref'            => $refCode,
                                'time'           => Carbon::parse($ub->updated_at ?? now())->format('M d, h:i A'),
                                'rawDate'        => $ub->updated_at ?? now(),
                                'is_read'        => isset($readKeys[$key]),
                            ]);
                        }
                    }
                }
            }

            $sorted = $notifs->sortByDesc('rawDate')->values();

            return response()->json($sorted);
        } 
        catch (\Throwable $e) {
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
