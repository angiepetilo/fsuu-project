<?php

namespace App\Http\Controllers;

use App\Models\AvrVenueBooking;
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AvrNotificationController extends Controller
{
    /**
     * Return system-level notifications: pending bookings, damage reports, overdue returns.
     * These are computed from the database — no separate notifications table needed.
     */
    public function index(): JsonResponse
    {
        $notifications = collect();

        // Pending venue bookings
        $pendingBookings = AvrVenueBooking::where('status', 'pending')
            ->latest()->take(10)->get();
        foreach ($pendingBookings as $b) {
            $notifications->push([
                'id'      => 'pb-' . $b->id,
                'type'    => 'pending_booking',
                'title'   => 'Pending Venue Booking',
                'message' => ($b->requestor_name ?? 'Someone') . ' requested ' . ($b->venue?->name ?? 'a venue'),
                'time'    => $b->created_at?->toIso8601String(),
                'read'    => false,
                'link'    => '/avr/venue-bookings',
            ]);
        }

        // Pending equipment borrowings
        $pendingBorrowings = EquipmentBorrowing::where('status', 'pending')
            ->latest()->take(10)->get();
        foreach ($pendingBorrowings as $b) {
            $notifications->push([
                'id'      => 'pe-' . $b->id,
                'type'    => 'pending_borrowing',
                'title'   => 'Pending Equipment Request',
                'message' => ($b->requestor_name ?? 'Someone') . ' wants to borrow equipment',
                'time'    => $b->created_at?->toIso8601String(),
                'read'    => false,
                'link'    => '/avr/equipment-borrowing',
            ]);
        }

        // Damaged equipment
        $damaged = EquipmentUnit::where('unit_status', 'damaged')
            ->with('equipmentType')
            ->latest()->take(5)->get();
        foreach ($damaged as $u) {
            $notifications->push([
                'id'      => 'dmg-' . $u->id,
                'type'    => 'damage_report',
                'title'   => 'Damaged Equipment',
                'message' => 'Unit ' . $u->barcode . ' (' . ($u->equipmentType?->name ?? 'Unknown') . ') is damaged',
                'time'    => $u->updated_at?->toIso8601String(),
                'read'    => false,
                'link'    => '/avr/inventory',
            ]);
        }

        // Overdue returns
        $overdue = EquipmentBorrowing::where('status', 'in_use')
            ->where('end_datetime', '<', now())
            ->latest()->take(5)->get();
        foreach ($overdue as $b) {
            $notifications->push([
                'id'      => 'od-' . $b->id,
                'type'    => 'overdue_return',
                'title'   => 'Overdue Return',
                'message' => ($b->requestor_name ?? 'A borrower') . ' has not returned equipment',
                'time'    => $b->end_datetime?->toIso8601String(),
                'read'    => false,
                'link'    => '/avr/equipment-borrowing',
            ]);
        }

        // Sort by time desc
        $sorted = $notifications->sortByDesc('time')->values();

        return response()->json([
            'data'  => $sorted,
            'count' => $sorted->count(),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        // Since notifications are computed, just return success
        return response()->json(['message' => 'Marked as read.']);
    }
}
