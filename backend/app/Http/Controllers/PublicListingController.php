<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PublicListingController extends Controller
{
    /**
     * GET /public/venues
     * Lists all active venues for the public booking form.
     */
    public function venues(): JsonResponse
    {
        return response()->json(
            Venue::with('office')
                ->where('status', '!=', 'maintenance')
                ->get()
                ->map(fn ($v) => [
                    'id'       => $v->id,
                    'name'     => $v->name,
                    'avatar'   => $v->avatar,
                    'photo'    => $v->avatar,
                    'image'    => $v->avatar,
                    'location' => $v->location ?? $v->office?->name ?? 'FSUU Campus',
                    'capacity' => $v->capacity ?? 100,
                    'type'     => ($v->office?->slug === 'fsuu-morelos'
                        || str_contains(strtolower($v->name), 'studio')
                        || str_contains(strtolower($v->name), 'theater'))
                        ? 'sco' : 'avr',
                    'office'   => $v->office,
                    'status'   => $v->status ?? 'Available',
                ])
        );
    }

    /**
     * GET /public/departments
     * Lists all departments created in the Department / Program catalog.
     */
    public function departments(): JsonResponse
    {
        return response()->json(
            \App\Models\Department::with('office')->orderBy('name')->get()
        );
    }

    /**
     * GET /public/equipment-types
     * Lists all equipment types for the public borrowing form with time-slot dynamic stock counts.
     */
    public function equipmentTypes(\Illuminate\Http\Request $request): JsonResponse
    {
        $startDatetime = $request->query('start_datetime');
        $endDatetime = $request->query('end_datetime');
        $dateStr = $request->query('date') ?? $request->query('date_of_usage') ?? ($startDatetime ? substr($startDatetime, 0, 10) : null);
        $startTimeStr = $request->query('time_start') ?? ($startDatetime ? substr($startDatetime, 11, 8) : null);
        $endTimeStr = $request->query('time_end') ?? ($endDatetime ? substr($endDatetime, 11, 8) : null);

        $equipmentTypes = EquipmentType::with('office')
            ->withCount([
                'equipmentUnits as calculated_total' => function ($q) {
                    $q->whereNull('archived_at');
                },
                'equipmentUnits as calculated_available' => function ($q) {
                    $q->whereNull('archived_at')->where('status', 'available');
                }
            ])
            ->get()
            ->map(function ($e) use ($dateStr, $startTimeStr, $endTimeStr) {
                $total = max(1, (int)($e->calculated_total > 0 ? $e->calculated_total : ($e->total_quantity ?? 1)));
                $avail = max(0, (int)($e->calculated_available > 0 ? $e->calculated_available : ($e->available_quantity ?? $total)));

                if ($dateStr && $startTimeStr && $endTimeStr) {
                    // 1. Calculate Equipment Borrowings overlapping this time slot
                    $borrowCommitted = \App\Models\EquipmentBorrowItem::where('equipment_type_id', $e->id)
                        ->whereHas('equipmentBorrow', function ($query) use ($dateStr, $startTimeStr, $endTimeStr) {
                            $query->whereHas('trackingNumber', fn($t) => $t->whereNotIn('status', ['rejected', 'cancelled']))
                                ->where('date_of_usage', $dateStr)
                                ->where('time_start', '<', $endTimeStr)
                                ->where('time_end', '>', $startTimeStr);
                        })
                        ->sum('quantity_requested');

                    // 2. Calculate Venue Bookings overlapping this date & time slot
                    $venueCommitted = \App\Models\AvrVenueBooking::whereHas('trackingNumber', fn($t) => $t->whereNotIn('status', ['rejected', 'cancelled']))
                        ->where('date_of_usage', $dateStr)
                        ->where('time_start', '<', $endTimeStr)
                        ->where('time_end', '>', $startTimeStr)
                        ->get()
                        ->sum(function ($vb) use ($e) {
                            $eqText = strtoupper($vb->equipment_needed ?? '');
                            $typeName = strtoupper($e->name ?? $e->eq_name ?? '');
                            if ($typeName && str_contains($eqText, $typeName)) {
                                preg_match('/\d+/', $eqText, $m);
                                return isset($m[0]) ? (int)$m[0] : 1;
                            }
                            return 0;
                        });

                    $totalCommitted = $borrowCommitted + $venueCommitted;
                    $avail = max(0, $total - $totalCommitted);
                }

                return [
                    'id'              => $e->id,
                    'name'            => $e->eq_name ?? $e->name ?? 'Equipment',
                    'eq_name'         => $e->eq_name ?? $e->name ?? 'Equipment',
                    'description'     => $e->description ?? $e->eq_type ?? 'Standard AV Gear',
                    'eq_type'         => $e->eq_type,
                    'barcode'         => $e->barcode,
                    'avatar'          => $e->avatar,
                    'total_quantity'  => $total,
                    'available_count' => $avail,
                    'status'          => $avail > 0 ? 'available' : 'unavailable',
                    'office_id'       => $e->office_id,
                    'office'          => $e->office,
                    'dept'            => ($e->office?->slug === 'fsuu-morelos'
                        || str_contains(strtolower($e->eq_type ?? ''), 'broadcast'))
                        ? 'sco' : 'avr',
                    'category'        => $e->eq_type ?? 'AVR Equipment',
                ];
            });

        return response()->json($equipmentTypes);
    }


    /**
     * GET /public/venue-bookings
     * Lists pending/approved bookings for availability calendar check.
     */
    public function venueBookings(): JsonResponse
    {
        $bookings = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereIn('tracking_numbers.status', ['pending', 'approved'])
            ->select(
                'venue_bookings.id',
                'venue_bookings.venue_id',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.date_of_usage',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'tracking_numbers.status'
            )
            ->get();

        return response()->json($bookings);
    }
}
