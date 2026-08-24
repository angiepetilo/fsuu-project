<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ListingController extends Controller
{
    /**
     * GET /public/venues
     * Lists all active venues for the public booking form.
     */
    public function venues(): JsonResponse
    {
        return response()->json(
            Venue::where('status', '!=', 'maintenance')
                ->get()
                ->map(function ($v) {
                    $imgUrl = str_starts_with($v->avatar ?? '', '/storage/') ? url($v->avatar) : $v->avatar;
                    return [
                        'id'        => $v->id,
                        'name'      => $v->name,
                        'avatar'    => $imgUrl,
                        'photo'     => $imgUrl,
                        'image'     => $imgUrl,
                        'location'  => $v->location ?? 'FSUU Campus',
                        'capacity'  => $v->capacity ?? 100,
                        'type'      => 'avr',
                        'status'    => $v->status ?? 'Available',
                        'allowed_equipment' => $v->allowed_equipment,
                    ];
                })
        );
    }   

    /**
     * GET /public/departments
     * Lists all departments created in the Department / Program catalog.
     */
    public function departments(): JsonResponse
    {
        return response()->json(
            \App\Models\Department::orderBy('name')->get()
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

        if ($dateStr && strlen($dateStr) > 10) {
            $dateStr = substr($dateStr, 0, 10);
        }
        if ($startTimeStr) {
            if (str_contains($startTimeStr, 'T')) {
                $startTimeStr = substr(explode('T', $startTimeStr)[1], 0, 5);
            }
            if (strlen($startTimeStr) === 5) {
                $startTimeStr .= ':00';
            }
        }
        if ($endTimeStr) {
            if (str_contains($endTimeStr, 'T')) {
                $endTimeStr = substr(explode('T', $endTimeStr)[1], 0, 5);
            }
            if (strlen($endTimeStr) === 5) {
                $endTimeStr .= ':00';
            }
        }

        $query = EquipmentType::withCount([
                'equipmentUnits as calculated_total' => function ($q) {
                    $q->whereNull('archived_at');
                },
                'equipmentUnits as calculated_operational' => function ($q) {
                    $q->whereNull('archived_at')
                      ->whereNotIn(DB::raw('LOWER(status)'), ['damaged', 'lost', 'decommissioned', 'maintenance'])
                      ->whereNotIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'under repair']);
                },
                'equipmentUnits as calculated_available' => function ($q) {
                    $q->whereNull('archived_at')
                      ->where('status', 'available')
                      ->whereNotIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'under repair']);
                }
            ]);

        $allTypes = $query->get();

        // High-Performance Optimization: Pre-aggregate overlapping commitments in 2 single queries (eliminates N+1 DB roundtrips)
        $borrowCommittedMap = [];
        $venueCommittedMap = [];

        if ($dateStr && $startTimeStr && $endTimeStr) {
            $cleanDate = substr($dateStr, 0, 10);

            // 1. Single aggregated query for all overlapping Equipment Borrow Items
            $rawBorrowItems = DB::table('equipment_borrow_items')
                ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNotIn('tracking_numbers.status', ['rejected', 'cancelled', 'completed', 'done', 'damaged', 'lost'])
                ->where('equipment_borrows.date_of_usage', '=', $cleanDate)
                ->where('equipment_borrows.time_start', '<', $endTimeStr)
                ->where('equipment_borrows.time_end', '>', $startTimeStr)
                ->select('equipment_borrow_items.equipment_type_id', DB::raw('SUM(equipment_borrow_items.quantity_requested) as total_qty'))
                ->groupBy('equipment_borrow_items.equipment_type_id')
                ->get();

            foreach ($rawBorrowItems as $bi) {
                $borrowCommittedMap[strtoupper(trim((string)$bi->equipment_type_id))] = (int)$bi->total_qty;
            }

            // 2. Single query for all overlapping Venue Bookings
            $overlappingVenueBookings = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNotIn('tracking_numbers.status', ['rejected', 'cancelled', 'completed', 'done', 'damaged', 'lost'])
                ->where('venue_bookings.date_of_usage', '<=', $cleanDate)
                ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$cleanDate])
                ->where('venue_bookings.time_start', '<', $endTimeStr)
                ->where('venue_bookings.time_end', '>', $startTimeStr)
                ->select('venue_bookings.id', 'venue_bookings.equipment_notes', 'venue_bookings.assigned_units')
                ->get();

            $vbIds = $overlappingVenueBookings->pluck('id')->toArray();
            $structVenueItems = [];
            if (!empty($vbIds) && \Illuminate\Support\Facades\Schema::hasTable('venue_booking_equipment')) {
                $structVenueItems = DB::table('venue_booking_equipment')
                    ->whereIn('venue_booking_id', $vbIds)
                    ->get();
            }

            // Populate venue committed count per equipment type
            foreach ($allTypes as $eType) {
                $typeKeys = [
                    strtoupper(trim((string)$eType->id)),
                    strtoupper(trim((string)($eType->name ?? ''))),
                    strtoupper(trim((string)($eType->eq_name ?? ''))),
                ];
                $totalForType = 0;

                // Check struct items
                if (!empty($structVenueItems)) {
                    foreach ($structVenueItems as $svi) {
                        $sId = strtoupper(trim((string)$svi->equipment_type_id));
                        if (in_array($sId, $typeKeys, true)) {
                            $totalForType += (int)($svi->quantity_requested ?? 1);
                        }
                    }
                }

                // Check notes on bookings
                foreach ($overlappingVenueBookings as $vb) {
                    $eqText = strtoupper($vb->equipment_notes ?? '');
                    $typeName = strtoupper($eType->name ?? $eType->eq_name ?? '');
                    if ($typeName && str_contains($eqText, $typeName)) {
                        if (preg_match('/\b' . preg_quote($typeName, '/') . '\s*\(Qty:\s*(\d+)\)/i', $eqText, $m)) {
                            $totalForType += (int)$m[1];
                        }
                    }
                }

                $venueCommittedMap[strtoupper(trim((string)$eType->id))] = $totalForType;
            }
        }

        $equipmentTypes = $allTypes->map(function ($e) use ($borrowCommittedMap, $venueCommittedMap, $dateStr, $startTimeStr, $endTimeStr) {
            $hasRegisteredUnits = $e->calculated_total > 0;
            $total = (int)($hasRegisteredUnits ? $e->calculated_total : ($e->total_quantity ?? 0));
            $operational = (int)($hasRegisteredUnits ? $e->calculated_operational : ($e->total_quantity ?? 0));
            $avail = (int)($hasRegisteredUnits ? $e->calculated_available : $operational);

            $typeKey = strtoupper(trim((string)$e->id));
            $typeNameKey = strtoupper(trim((string)($e->name ?? $e->eq_name ?? '')));

            $borrowCommitted = $borrowCommittedMap[$typeKey] ?? $borrowCommittedMap[$typeNameKey] ?? 0;
            $venueCommitted = $venueCommittedMap[$typeKey] ?? 0;

            if ($dateStr && $startTimeStr && $endTimeStr) {
                $totalCommitted = $borrowCommitted + $venueCommitted;
                $avail = max(0, $operational - $totalCommitted);
            }

            return [
                'id'              => $e->id,
                'name'            => $e->eq_name ?? 'Equipment',
                'category'        => $e->eq_name ?? 'Equipment',
                'eq_name'         => $e->eq_name ?? 'Equipment',
                'brand'           => $e->brand,
                'description'     => $e->description ?? 'Standard AV Gear',
                'avatar'          => $e->avatar,
                'total_quantity'  => $total,
                'present_count'   => $operational,
                'available_count' => $avail,
                'in_use_count'    => (int)$borrowCommitted,
                'reserved_count'  => (int)$venueCommitted,
                'status'          => $avail > 0 ? 'available' : 'unavailable',
                'dept'            => 'avr',
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
                'venue_bookings.reservation_end_date',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'tracking_numbers.status'
            )
            ->get();

        return response()->json($bookings);
    }
}
