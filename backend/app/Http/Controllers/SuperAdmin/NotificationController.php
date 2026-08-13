<?php

namespace App\Http\Controllers\SuperAdmin;

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
            $userId = $user ? $user->id : null;

            $readKeys = DB::table('notification_reads')
                ->where('user_id', $userId)
                ->pluck('notification_key')
                ->flip();

            $notifs = collect();

            // Pull recent venue bookings across all offices
            $recentVenueBookings = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                ->leftJoin('offices', 'venues.office_id', '=', 'offices.id')
                ->whereNull('venue_bookings.archived_at')
                ->select(
                    'venue_bookings.id',
                    'venue_bookings.filer_name',
                    'venue_bookings.program_office',
                    'venue_bookings.created_at',
                    'venue_bookings.updated_at',
                    'venues.name as venue_name',
                    'offices.name as office_name',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderByDesc('venue_bookings.updated_at')
                ->limit(20);

            foreach ($recentVenueBookings->get() as $b) {
                $key = 'sysad-vb-' . $b->id . '-' . strtolower($b->status ?? '');
                $st = strtolower($b->status ?? '');
                $isCompleted = in_array($st, ['completed', 'done', 'solved']);
                $url = $isCompleted 
                    ? '/sysad/history-log?id=' . $b->id . '&type=venue'
                    : '/sysad/venue-bookings?id=' . $b->id . '&trk=' . $b->reference_code;

                $notifs->push([
                    'id'          => $key,
                    'target_id'   => $b->id,
                    'target_type' => 'venue_booking',
                    'url'         => $url,
                    'title'       => ($b->office_name ?? 'FSUU Main') . ' Venue ' . ucfirst($b->status ?? 'Booking'),
                    'message'     => ($b->venue_name ?? 'AVR') . ' by ' . ($b->program_office ?? $b->filer_name ?? 'Requestor') . ' (' . $b->reference_code . ')',
                    'office'      => $b->office_name ?? 'FSUU Main',
                    'ref'         => $b->reference_code,
                    'status'      => $b->status,
                    'priority'    => $st === 'pending' ? 'high' : 'medium',
                    'time'        => Carbon::parse($b->updated_at ?? $b->created_at)->diffForHumans(),
                    'rawDate'     => $b->updated_at ?? $b->created_at,
                    'is_read'     => isset($readKeys[$key]),
                ]);
            }

            // Pull recent equipment borrows across all offices
            $recentEquipBorrows = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('offices', 'equipment_borrows.office_id', '=', 'offices.id')
                ->whereNull('equipment_borrows.archived_at')
                ->select(
                    'equipment_borrows.id',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.program_office',
                    'equipment_borrows.created_at',
                    'equipment_borrows.updated_at',
                    'offices.name as office_name',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderByDesc('equipment_borrows.updated_at')
                ->limit(20);

            foreach ($recentEquipBorrows->get() as $b) {
                $key = 'sysad-eb-' . $b->id . '-' . strtolower($b->status ?? '');
                $st = strtolower($b->status ?? '');
                $isCompleted = in_array($st, ['completed', 'done', 'solved']);
                $url = $isCompleted 
                    ? '/sysad/history-log?id=' . $b->id . '&type=equipment'
                    : '/sysad/equipment-borrowing?id=' . $b->id . '&trk=' . $b->reference_code;

                $notifs->push([
                    'id'          => $key,
                    'target_id'   => $b->id,
                    'target_type' => 'equipment_borrow',
                    'url'         => $url,
                    'title'       => ($b->office_name ?? 'FSUU Main') . ' Equipment ' . ucfirst($b->status ?? 'Borrow'),
                    'message'     => 'Equipment borrow for ' . ($b->program_office ?? $b->filer_name ?? 'Borrower') . ' (' . $b->reference_code . ')',
                    'office'      => $b->office_name ?? 'FSUU Main',
                    'ref'         => $b->reference_code,
                    'status'      => $b->status,
                    'priority'    => $st === 'pending' || $st === 'damaged' ? 'high' : 'medium',
                    'time'        => Carbon::parse($b->updated_at ?? $b->created_at)->diffForHumans(),
                    'rawDate'     => $b->updated_at ?? $b->created_at,
                    'is_read'     => isset($readKeys[$key]),
                ]);
            }

            $sorted = $notifs->sortByDesc('rawDate')->values();

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
