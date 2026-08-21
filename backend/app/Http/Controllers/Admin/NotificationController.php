<?php

namespace App\Http\Controllers\Admin;

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

            // 1. Venue Bookings Notifications
            $vbQuery = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                ->whereNull('venue_bookings.archived_at')
                ->select(
                    'venue_bookings.id',
                    'venue_bookings.filer_name',
                    'venue_bookings.program_office',
                    'venue_bookings.email_address',
                    'venue_bookings.contact_number',
                    'venue_bookings.date_of_usage',
                    'venue_bookings.created_at',
                    'venue_bookings.updated_at',
                    'venues.name as venue_name',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderByDesc('venue_bookings.updated_at')
                ->limit(30);

            foreach ($vbQuery->get() as $b) {
                $st = strtolower($b->status ?? '');
                $ref = $b->reference_code ?? 'TRK-AVR';
                $dt = Carbon::parse($b->updated_at ?? $b->created_at);
                $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                $rawDate = $b->updated_at ?? $b->created_at;

                $key = 'notif-vb-' . $st . '-' . $b->id;
                $notifs->push([
                    'id'             => $key,
                    'target_id'      => $b->id,
                    'target_type'    => 'venue_booking',
                    'incident_type'  => 'venue_booking',
                    'url'            => '/admin/venue-bookings?id=' . $b->id . '&trk=' . $ref,
                    'type'           => $st === 'pending' ? 'pending_booking' : 'booking_' . $st,
                    'priority'       => $st === 'pending' ? 'high' : 'medium',
                    'title'          => $st === 'pending' ? 'New Venue Booking' : 'Venue Booking ' . ucfirst($st),
                    'message'        => ($b->filer_name ?? $b->program_office ?? 'Requestor') . ' booked ' . ($b->venue_name ?? 'Venue Facility'),
                    'person_name'    => $b->filer_name ?? 'Requestor',
                    'person_contact' => $b->contact_number ?? 'N/A',
                    'person_office'  => $b->program_office ?? 'Department',
                    'person_email'   => $b->email_address ?? 'N/A',
                    'item_name'      => $b->venue_name ?? 'Venue Facility',
                    'ref'            => $ref,
                    'time'           => $time,
                    'rawDate'        => $rawDate,
                    'is_read'        => isset($readKeys[$key]),
                ]);
            }

            // 2. Equipment Borrowing Notifications
            $ebQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->select(
                    'equipment_borrows.id',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.program_office',
                    'equipment_borrows.email_address',
                    'equipment_borrows.contact_number',
                    'equipment_borrows.created_at',
                    'equipment_borrows.updated_at',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderByDesc('equipment_borrows.updated_at')
                ->limit(30);

            foreach ($ebQuery->get() as $b) {
                $st = strtolower($b->status ?? '');
                $ref = $b->reference_code ?? 'TRK-BORROW';
                $dt = Carbon::parse($b->updated_at ?? $b->created_at);
                $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                $rawDate = $b->updated_at ?? $b->created_at;

                $key = 'notif-eb-' . $st . '-' . $b->id;
                $notifs->push([
                    'id'             => $key,
                    'target_id'      => $b->id,
                    'target_type'    => 'equipment_borrow',
                    'incident_type'  => 'equipment_borrow',
                    'url'            => '/admin/equipment-borrowing?id=' . $b->id . '&trk=' . $ref,
                    'type'           => $st === 'pending' ? 'pending_borrow' : 'borrow_' . $st,
                    'priority'       => $st === 'pending' ? 'high' : 'medium',
                    'title'          => $st === 'pending' ? 'New Equipment Request' : 'Equipment Borrow ' . ucfirst($st),
                    'message'        => ($b->filer_name ?? $b->program_office ?? 'Borrower') . ' requested equipment (' . $ref . ')',
                    'person_name'    => $b->filer_name ?? 'Borrower',
                    'person_contact' => $b->contact_number ?? 'N/A',
                    'person_office'  => $b->program_office ?? 'Department',
                    'person_email'   => $b->email_address ?? 'N/A',
                    'item_name'      => 'Requested Equipment',
                    'ref'            => $ref,
                    'time'           => $time,
                    'rawDate'        => $rawDate,
                    'is_read'        => isset($readKeys[$key]),
                ]);
            }

            // 3. Damaged, Lost & Policy Violation Incidents from Inspections
            if (Schema::hasTable('inspections')) {
                $inspections = DB::table('inspections')
                    ->whereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'missing'])
                    ->orWhereNotNull('violation_type')
                    ->orWhere('is_late', true)
                    ->orderByDesc('created_at')
                    ->limit(30)
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
                        $key = 'admin-dmg-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'damaged_unit',
                            'incident_type'     => 'damaged',
                            'title'             => 'Damaged Physical Unit',
                            'message'           => "Physical unit reported damaged by {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical equipment unit returned with damage.',
                            'evidence_photo'    => $ins->evidence_photo ?? null,
                            'ref'               => $refCode,
                            'priority'          => 'high',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    } elseif ($isLost) {
                        $key = 'admin-lost-' . $ins->id;
                        $notifs->push([
                            'id'                => $key,
                            'target_id'         => $ins->id,
                            'target_type'       => 'lost_unit',
                            'incident_type'     => 'lost',
                            'title'             => 'Lost Physical Unit',
                            'message'           => "Physical unit reported lost/missing by {$personName} ({$refCode})",
                            'person_name'       => $personName,
                            'person_contact'    => $personContact,
                            'person_office'     => $personOffice,
                            'person_email'      => $personEmail,
                            'item_name'         => !empty($unitCodes) ? implode(', ', $unitCodes) : $itemName,
                            'unit_code'         => !empty($unitCodes) ? implode(', ', $unitCodes) : 'N/A',
                            'notes'             => $ins->notes ?: 'Physical equipment unit not returned / marked lost.',
                            'ref'               => $refCode,
                            'priority'          => 'high',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }

                    if ($hasViolation) {
                        $violationTitle = $ins->violation_type ?: ($ins->is_late ? "Late Return ({$ins->minutes_late} mins)" : 'Policy Violation');
                        $key = 'admin-viol-' . $ins->id;
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
                            'ref'               => $refCode,
                            'priority'          => 'high',
                            'time'              => $formattedTime,
                            'rawDate'           => $rawDate,
                            'is_read'           => isset($readKeys[$key]),
                        ]);
                    }
                }
            }

            $sorted = $notifs->sortByDesc('rawDate')->values();

            return response()->json($sorted);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Admin NotificationController error: ' . $e->getMessage());
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
