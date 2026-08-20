<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $isSuperAdmin = $user ? $user->isSuperAdmin() : true;
            $officeId = $user ? $user->office_id : null;
            $userId = $user ? $user->id : null;

            // Fetch user's read notification keys from database
            $readKeys = DB::table('notification_reads')
                ->where('user_id', $userId)
                ->pluck('notification_key')
                ->flip();

            $notifs = collect();

            // 1. Venue Bookings Notifications
            $vbQuery = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
                ->whereNull('venue_bookings.archived_at')
                ->select(
                    'venue_bookings.id',
                    'venue_bookings.filer_name',
                    'venue_bookings.program_office',
                    'venue_bookings.date_of_usage',
                    'venue_bookings.created_at',
                    'venue_bookings.updated_at',
                    'venues.name as venue_name',
                    'offices.name as office_name',
                    'offices.id as office_id',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderByDesc('venue_bookings.updated_at')
                ->limit(25);

            if (!$isSuperAdmin && $officeId) {
                $vbQuery->where('offices.id', $officeId);
            }

            foreach ($vbQuery->get() as $b) {
                $st = strtolower($b->status ?? '');
                $office = $b->office_name ?? 'AVR Office';
                $ref = $b->reference_code ?? 'TRK-AVR';
                $dt = Carbon::parse($b->updated_at ?? $b->created_at);
                $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                $rawDate = $b->updated_at ?? $b->created_at;

                if ($st === 'pending') {
                    $key = 'notif-vb-pending-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'venue_booking',
                        'url'         => '/admin/venue-bookings?id=' . $b->id . '&trk=' . $ref,
                        'type'        => 'pending_booking',
                        'priority'    => 'high',
                        'title'       => 'New Venue Booking',
                        'message'     => ($b->filer_name ?? $b->program_office ?? 'Requestor') . ' booked ' . ($b->venue_name ?? 'Venue'),
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'calendar',
                        'color'       => 'blue',
                    ]);
                } elseif ($st === 'approved') {
                    $key = 'notif-vb-approved-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'venue_booking',
                        'url'         => '/admin/venue-bookings?id=' . $b->id . '&trk=' . $ref,
                        'type'        => 'booking_approved',
                        'priority'    => 'medium',
                        'title'       => 'Venue Booking Approved',
                        'message'     => ($b->venue_name ?? 'Venue') . ' booking approved for ' . ($b->filer_name ?? 'Requestor'),
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'check-circle',
                        'color'       => 'green',
                    ]);
                } elseif ($st === 'ongoing' || $st === 'on-going') {
                    $key = 'notif-vb-ongoing-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'venue_booking',
                        'url'         => '/admin/venue-bookings?id=' . $b->id . '&trk=' . $ref,
                        'type'        => 'booking_ongoing',
                        'priority'    => 'medium',
                        'title'       => 'Venue Booking On-Going',
                        'message'     => ($b->venue_name ?? 'Venue') . ' event in progress (' . ($b->filer_name ?? 'Requestor') . ')',
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'clock',
                        'color'       => 'blue',
                    ]);
                } elseif (in_array($st, ['completed', 'done', 'solved'])) {
                    $key = 'notif-vb-completed-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'venue_booking',
                        'url'         => '/admin/history-log?id=' . $b->id . '&type=venue',
                        'type'        => 'booking_completed',
                        'priority'    => 'low',
                        'title'       => 'Venue Booking Completed',
                        'message'     => ($b->venue_name ?? 'Venue') . ' event concluded',
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'check-circle',
                        'color'       => 'muted-green',
                    ]);
                }
            }

            // 2. Equipment Borrowings Notifications
            $ebQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('offices', 'equipment_borrows.office_id', '=', 'offices.id')
                ->leftJoin('inspections', 'equipment_borrows.id', '=', 'inspections.inspectable_id')
                ->whereNull('equipment_borrows.archived_at')
                ->select(
                    'equipment_borrows.id',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.program_office',
                    'equipment_borrows.created_at',
                    'equipment_borrows.updated_at',
                    'offices.name as office_name',
                    'offices.id as office_id',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status',
                    'inspections.condition as inspection_condition'
                )
                ->orderByDesc('equipment_borrows.updated_at')
                ->limit(25);

            if (!$isSuperAdmin && $officeId) {
                $ebQuery->where('equipment_borrows.office_id', $officeId);
            }

            foreach ($ebQuery->get() as $b) {
                $st = strtolower($b->status ?? '');
                $office = $b->office_name ?? 'AVR Office';
                $ref = $b->reference_code ?? 'TRK-EQB';
                $dt = Carbon::parse($b->updated_at ?? $b->created_at);
                $time = $dt->isToday() ? $dt->format('h:i A') : $dt->format('M d, h:i A');
                $rawDate = $b->updated_at ?? $b->created_at;

                if ($st === 'damaged' || strtolower($b->inspection_condition ?? '') === 'damaged') {
                    $key = 'notif-eb-damaged-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'equipment_borrow',
                        'url'         => '/admin/equipment-borrowings?id=' . $b->id . '&trk=' . $ref,
                        'type'        => 'equipment_damaged',
                        'priority'    => 'high',
                        'title'       => 'Equipment Damaged Alert',
                        'message'     => 'Damaged equipment reported during inspection for ' . ($b->filer_name ?? 'Borrower'),
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'alert-triangle',
                        'color'       => 'red',
                    ]);
                } elseif ($st === 'pending') {
                    $key = 'notif-eb-pending-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'equipment_borrow',
                        'url'         => '/admin/equipment-borrowings?id=' . $b->id . '&trk=' . $ref,
                        'type'        => 'pending_borrow',
                        'priority'    => 'high',
                        'title'       => 'New Equipment Borrow Request',
                        'message'     => ($b->filer_name ?? 'Borrower') . ' submitted a new equipment borrowing request',
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'box',
                        'color'       => 'blue',
                    ]);
                } elseif ($st === 'approved') {
                    $key = 'notif-eb-approved-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'equipment_borrow',
                        'url'         => '/admin/equipment-borrowings?id=' . $b->id . '&trk=' . $ref,
                        'type'        => 'borrow_approved',
                        'priority'    => 'medium',
                        'title'       => 'Borrow Request Approved',
                        'message'     => 'Equipment borrow approved for ' . ($b->filer_name ?? 'Borrower'),
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'check-circle',
                        'color'       => 'green',
                    ]);
                } elseif (in_array($st, ['completed', 'returned', 'done', 'solved'])) {
                    $key = 'notif-eb-returned-' . $b->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $b->id,
                        'target_type' => 'equipment_borrow',
                        'url'         => '/admin/history-log?id=' . $b->id . '&type=equipment',
                        'type'        => 'equipment_returned',
                        'priority'    => 'low',
                        'title'       => 'Equipment Returned',
                        'message'     => 'Equipment returned in good condition by ' . ($b->filer_name ?? 'Borrower'),
                        'office'      => $office,
                        'ref'         => $ref,
                        'time'        => $time,
                        'rawDate'     => $rawDate,
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'rotate-ccw',
                        'color'       => 'muted-green',
                    ]);
                }
            }

            // 3. Low/No Stock Alerts across inventory
            $eqTypes = DB::table('equipment_types')
                ->whereNull('deleted_at')
                ->get();

            foreach ($eqTypes as $eq) {
                $totalUnits = DB::table('equipment_units')
                    ->where('equipment_type_id', $eq->id)
                    ->whereNull('deleted_at')
                    ->count();

                $availableUnits = DB::table('equipment_units')
                    ->where('equipment_type_id', $eq->id)
                    ->where('status', 'available')
                    ->whereNull('deleted_at')
                    ->count();

                $catName = $eq->eq_name ?? $eq->name ?? 'Equipment Category';

                if ($totalUnits > 0 && $availableUnits <= 1) {
                    $key = 'notif-stock-' . $eq->id . '-' . $availableUnits;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $eq->id,
                        'target_type' => 'equipment_type',
                        'url'         => '/admin/manage-equipments',
                        'type'        => 'stock_alert',
                        'priority'    => 'high',
                        'title'       => $availableUnits === 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
                        'message'     => "{$catName} has only {$availableUnits} unit(s) available in inventory.",
                        'office'      => 'Inventory',
                        'ref'         => 'STOCK-' . $eq->id,
                        'time'        => now()->format('h:i A'),
                        'rawDate'     => now()->toDateTimeString(),
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'package',
                    ]);
                }
            }

            $sorted = $notifs->sortByDesc('rawDate')->values()->toArray();

            return response()->json($sorted);
        } catch (\Throwable $e) {
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
            // Retrieve all current active notification keys from index logic
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
