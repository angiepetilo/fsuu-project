<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminNotificationController extends Controller
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
                $office = $b->office_name ?? 'FSUU Main';
                $ref = $b->reference_code ?? 'TRK-AVR';
                $time = Carbon::parse($b->updated_at ?? $b->created_at)->diffForHumans();
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
                        'title'       => 'Pending Venue Booking',
                        'message'     => ($b->program_office ?? $b->filer_name ?? 'Requestor') . ' requested ' . ($b->venue_name ?? 'Venue'),
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
                        'title'       => 'Booking Approved',
                        'message'     => ($b->venue_name ?? 'Venue') . ' booking approved for ' . ($b->program_office ?? $b->filer_name ?? 'Requestor'),
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
                        'title'       => 'Venue Event Ongoing',
                        'message'     => ($b->venue_name ?? 'Venue') . ' is currently occupied by ' . ($b->program_office ?? $b->filer_name ?? 'Requestor'),
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
                        'title'       => 'Booking Completed',
                        'message'     => ($b->venue_name ?? 'Venue') . ' event concluded (' . ($b->program_office ?? $b->filer_name ?? 'Requestor') . ')',
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
                $office = $b->office_name ?? 'FSUU Main';
                $ref = $b->reference_code ?? 'TRK-EQB';
                $time = Carbon::parse($b->updated_at ?? $b->created_at)->diffForHumans();
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
                        'title'       => 'Equipment Damaged',
                        'message'     => 'Damaged equipment reported during return/inspection by ' . ($b->program_office ?? $b->filer_name ?? 'Borrower'),
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
                        'title'       => 'Pending Borrow Request',
                        'message'     => ($b->program_office ?? $b->filer_name ?? 'Borrower') . ' submitted equipment borrow request',
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
                        'title'       => 'Borrow Approved',
                        'message'     => 'Equipment borrow approved for ' . ($b->program_office ?? $b->filer_name ?? 'Borrower'),
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
                        'message'     => 'Borrowed equipment returned in good condition (status → Available)',
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

            // 3. Low/No Stock Alerts
            $eqStockQuery = DB::table('equipment_types')
                ->leftJoin('offices', 'equipment_types.office_id', '=', 'offices.id')
                ->select('equipment_types.*', 'offices.name as office_name');

            if (!$isSuperAdmin && $officeId) {
                $eqStockQuery->where('equipment_types.office_id', $officeId);
            }

            foreach ($eqStockQuery->get() as $eq) {
                $qty = (int)($eq->total_quantity ?? $eq->available_quantity ?? 0);
                if ($qty <= 2) {
                    $key = 'notif-stock-' . $eq->id;
                    $notifs->push([
                        'id'          => $key,
                        'target_id'   => $eq->id,
                        'target_type' => 'equipment_type',
                        'url'         => '/admin/manage-equipments',
                        'type'        => 'stock_alert',
                        'priority'    => 'high',
                        'title'       => $qty === 0 ? 'No Stock Alert' : 'Low Stock Alert',
                        'message'     => ($eq->eq_name ?? 'Equipment') . ' available quantity is ' . $qty,
                        'office'      => $eq->office_name ?? 'FSUU Main',
                        'ref'         => 'STOCK-' . $eq->id,
                        'time'        => 'Recent',
                        'rawDate'     => now()->toDateTimeString(),
                        'is_read'     => isset($readKeys[$key]),
                        'icon'        => 'package',
                        'color'       => 'amber',
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
