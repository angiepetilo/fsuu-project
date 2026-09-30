<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\VenueOverride;
use App\Models\EquipmentOverride;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueAvailabilityController extends Controller
{
    /**
     * GET /public/venue-overrides
     * Returns live active overrides (maintenance, closed, etc.) for venues.
     */
    public function publicOverrides(Request $request): JsonResponse
    {
        $query = VenueOverride::query()->with('venue:id,name');

        if ($request->filled('venue_id') && $request->venue_id !== 'all') {
            $vId = $request->integer('venue_id');
            $query->where(function ($q) use ($vId) {
                $q->whereNull('venue_id')->orWhere('venue_id', $vId);
            });
        }

        if ($request->filled('month') && $request->filled('year')) {
            $year = $request->integer('year');
            $month = $request->integer('month');
            $startDate = Carbon::create($year, $month, 1)->startOfDay();
            $endDate = $startDate->copy()->endOfMonth();
            $query->whereBetween('override_date', [$startDate->toDateString(), $endDate->toDateString()]);
        }

        return response()->json($query->orderBy('override_date')->get());
    }

    /**
     * GET /public/equipment-overrides
     * Returns active overrides (closed, maintenance) for equipment borrowing.
     */
    public function publicEquipmentOverrides(Request $request): JsonResponse
    {
        $query = EquipmentOverride::query();

        if ($request->filled('month') && $request->filled('year')) {
            $year = $request->integer('year');
            $month = $request->integer('month');
            $startDate = Carbon::create($year, $month, 1)->startOfDay();
            $endDate = $startDate->copy()->endOfMonth();
            $query->whereBetween('override_date', [$startDate->toDateString(), $endDate->toDateString()]);
        }

        return response()->json($query->orderBy('override_date')->get());
    }

    /**
     * GET /general/venue-availability?venue_id=&year=&month=
     * Returns computed booking density AND overrides (maintenance, closed) for a venue/month.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'venue_id' => 'required',
            'year'     => 'required|integer',
            'month'    => 'required|integer|between:1,12',
        ]);

        $rawVenueId = $request->input('venue_id');
        $isAllVenues = ($rawVenueId === 'all' || $rawVenueId === 0 || $rawVenueId === '0');
        $venueId     = $isAllVenues ? null : (int) $rawVenueId;
        $year        = $request->integer('year');
        $month       = $request->integer('month');

        $startDate = Carbon::create($year, $month, 1)->startOfDay();
        $endDate   = $startDate->copy()->endOfMonth();

        // 1. Fetch live overrides for this venue (or all venues) and month
        $overridesQuery = VenueOverride::whereBetween('override_date', [$startDate->toDateString(), $endDate->toDateString()]);
        if (!$isAllVenues && $venueId) {
            $overridesQuery->where('venue_id', $venueId);
        }
        $overridesList = $overridesQuery->get();

        // 2. Fetch equipment overrides for this month
        $equipOverrides = EquipmentOverride::whereBetween('override_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->override_date)->toDateString();
            });

        // 3. Booking counts per day
        $bookingCountsQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('venue_bookings.archived_at')
            ->whereIn('tracking_numbers.status', ['approved', 'ongoing', 'on-going', 'reserved'])
            ->whereBetween('venue_bookings.date_of_usage', [$startDate->toDateString(), $endDate->toDateString()]);

        if (!$isAllVenues && $venueId) {
            $bookingCountsQuery->where('venue_bookings.venue_id', $venueId);
        }

        $bookingCounts = $bookingCountsQuery
            ->select('venue_bookings.date_of_usage', DB::raw('count(*) as count'))
            ->groupBy('venue_bookings.date_of_usage')
            ->get()
            ->keyBy('date_of_usage');

        // Total venues count for "all venues" scope
        $totalVenuesCount = Venue::count();

        // 4. Build day-by-day map for the month
        $days = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $dateStr = $cursor->toDateString();
            $bookings = $bookingCounts[$dateStr]->count ?? 0;
            $eqOverride = $equipOverrides[$dateStr] ?? null;

            if ($isAllVenues) {
                $dayOverrides = $overridesList->filter(function ($item) use ($dateStr) {
                    return Carbon::parse($item->override_date)->toDateString() === $dateStr;
                });
                $hasClosed = $dayOverrides->contains(fn($o) => strtolower($o->status) === 'closed');
                $hasMaint = $dayOverrides->contains(fn($o) => in_array(strtolower($o->status), ['maintenance', 'damaged']));

                if ($dayOverrides->count() >= $totalVenuesCount && $totalVenuesCount > 0) {
                    $status = $hasClosed ? 'closed' : 'maintenance';
                    $notes = "All venues set to " . ucfirst($status);
                } elseif ($dayOverrides->count() > 0) {
                    $status = $hasClosed ? 'closed' : 'maintenance';
                    $notes = "{$dayOverrides->count()} of {$totalVenuesCount} venues under " . ucfirst($status);
                } elseif ($bookings === 0) {
                    $status = 'available';
                    $notes = null;
                } else {
                    $status = 'partial';
                    $notes = "{$bookings} Active Booking(s)";
                }

                $days[$dateStr] = [
                    'date'             => $dateStr,
                    'status'           => $status,
                    'bookings'         => $bookings,
                    'notes'            => $notes,
                    'start_time'       => '07:30',
                    'end_time'         => '17:00',
                    'override_id'      => null,
                    'equipment_closed' => $eqOverride && in_array(strtolower($eqOverride->status), ['closed', 'maintenance']),
                    'equipment_notes'  => $eqOverride?->notes,
                ];
            } else {
                $override = $overridesList->first(function ($item) use ($dateStr) {
                    return Carbon::parse($item->override_date)->toDateString() === $dateStr;
                });

                if ($override && in_array(strtolower($override->status), ['maintenance', 'closed', 'damaged'])) {
                    $status = strtolower($override->status) === 'damaged' ? 'maintenance' : strtolower($override->status);
                    $notes = $override->notes ?? "Assigned {$status} status";
                } elseif ($bookings === 0) {
                    $status = 'available';
                    $notes = null;
                } elseif ($bookings >= 3) {
                    $status = 'fully_booked';
                    $notes = "{$bookings} Bookings (Fully Booked)";
                } else {
                    $status = 'partial';
                    $notes = "{$bookings} Active Booking(s)";
                }

                $days[$dateStr] = [
                    'date'             => $dateStr,
                    'status'           => $status,
                    'bookings'         => $bookings,
                    'notes'            => $notes,
                    'start_time'       => $override->start_time ?? '07:30',
                    'end_time'         => $override->end_time ?? '17:00',
                    'override_id'      => $override->id ?? null,
                    'equipment_closed' => $eqOverride && in_array(strtolower($eqOverride->status), ['closed', 'maintenance']),
                    'equipment_notes'  => $eqOverride?->notes,
                ];
            }

            $cursor->addDay();
        }

        return response()->json(array_values($days));
    }

    /**
     * GET /general/venues-list — returns all venues
     */
    public function venuesList(Request $request): JsonResponse
    {
        $query = Venue::query()->orderBy('name');
        return response()->json($query->get());
    }

    /**
     * POST /general/venue-availability — persist venue status override (maintenance, closed, available)
     * Supports single venue or 'all' venues, plus optional close_equipment flag.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'venue_id'        => 'required',
            'override_date'   => 'required|date',
            'status'          => 'required|string',
            'start_time'      => 'nullable|string',
            'end_time'        => 'nullable|string',
            'notes'           => 'nullable|string|max:500',
            'reason'          => 'nullable|string|max:500',
            'close_equipment' => 'nullable|boolean',
        ]);

        $statusLower = strtolower($validated['status']);
        $dateFormatted = Carbon::parse($validated['override_date'])->toDateString();
        $notes = $validated['notes'] ?? $validated['reason'] ?? null;
        $isAllVenues = ($validated['venue_id'] === 'all' || $validated['venue_id'] === '0' || $validated['venue_id'] === 0);

        // 1. Handle Venue Overrides
        if ($isAllVenues) {
            $venues = Venue::all();
            if ($statusLower === 'available') {
                VenueOverride::where('override_date', $dateFormatted)
                    ->where(function ($q) use ($venues) {
                        $q->whereNull('venue_id');
                        if ($venues->isNotEmpty()) {
                            $q->orWhereIn('venue_id', $venues->pluck('id'));
                        }
                    })
                    ->delete();
            } else {
                $normalizedStatus = ($statusLower === 'damaged') ? 'maintenance' : $statusLower;
                if (!in_array($normalizedStatus, ['maintenance', 'closed'])) {
                    $normalizedStatus = 'maintenance';
                }

                VenueOverride::updateOrCreate(
                    [
                        'venue_id'      => null,
                        'override_date' => $dateFormatted,
                    ],
                    [
                        'status'     => $normalizedStatus,
                        'start_time' => $validated['start_time'] ?? '07:30',
                        'end_time'   => $validated['end_time'] ?? '17:00',
                        'notes'      => $notes ?? "Assigned {$normalizedStatus} status for all venues",
                        'created_by' => auth()->id(),
                    ]
                );

                foreach ($venues as $venue) {
                    VenueOverride::updateOrCreate(
                        [
                            'venue_id'      => $venue->id,
                            'override_date' => $dateFormatted,
                        ],
                        [
                            'status'     => $normalizedStatus,
                            'start_time' => $validated['start_time'] ?? '07:30',
                            'end_time'   => $validated['end_time'] ?? '17:00',
                            'notes'      => $notes ?? "Assigned {$normalizedStatus} status for all venues",
                            'created_by' => auth()->id(),
                        ]
                    );
                }
            }
        } else {
            if ($statusLower === 'available') {
                VenueOverride::where('venue_id', $validated['venue_id'])
                    ->where('override_date', $dateFormatted)
                    ->delete();
            } else {
                $normalizedStatus = ($statusLower === 'damaged') ? 'maintenance' : $statusLower;
                if (!in_array($normalizedStatus, ['maintenance', 'closed'])) {
                    $normalizedStatus = 'maintenance';
                }

                VenueOverride::updateOrCreate(
                    [
                        'venue_id'      => $validated['venue_id'],
                        'override_date' => $dateFormatted,
                    ],
                    [
                        'status'     => $normalizedStatus,
                        'start_time' => $validated['start_time'] ?? '07:30',
                        'end_time'   => $validated['end_time'] ?? '17:00',
                        'notes'      => $notes ?? "Assigned {$normalizedStatus} status",
                        'created_by' => auth()->id(),
                    ]
                );
            }
        }

        // 2. Handle Equipment Borrowing Override if requested
        if ($request->has('close_equipment')) {
            $shouldClose = $request->boolean('close_equipment');
            if ($shouldClose) {
                EquipmentOverride::updateOrCreate(
                    ['override_date' => $dateFormatted],
                    [
                        'status'     => 'closed',
                        'start_time' => $validated['start_time'] ?? '07:30',
                        'end_time'   => $validated['end_time'] ?? '17:00',
                        'notes'      => $notes ?? 'Equipment borrowing closed by administrator',
                        'created_by' => auth()->id(),
                    ]
                );
            } else {
                if ($statusLower === 'available' || $request->input('close_equipment') === false) {
                    EquipmentOverride::where('override_date', $dateFormatted)->delete();
                }
            }
        }

        return response()->json([
            'message' => $isAllVenues
                ? "Operating status updated for all venues"
                : "Venue operating status updated",
            'date'    => $dateFormatted,
            'status'  => $statusLower,
        ], 200);
    }

    /**
     * GET /general/equipment-availability?year=&month=
     */
    public function equipmentAvailability(Request $request): JsonResponse
    {
        $year  = $request->integer('year', Carbon::now()->year);
        $month = $request->integer('month', Carbon::now()->month);

        $startDate = Carbon::create($year, $month, 1)->startOfDay();
        $endDate   = $startDate->copy()->endOfMonth();

        $overrides = EquipmentOverride::whereBetween('override_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();

        return response()->json($overrides);
    }

    /**
     * POST /general/equipment-availability
     */
    public function storeEquipmentAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'override_date' => 'required|date',
            'status'        => 'required|string',
            'start_time'    => 'nullable|string',
            'end_time'      => 'nullable|string',
            'notes'         => 'nullable|string|max:500',
        ]);

        $date = Carbon::parse($validated['override_date'])->toDateString();
        $status = strtolower($validated['status']);

        if ($status === 'available') {
            EquipmentOverride::where('override_date', $date)->delete();
            return response()->json(['message' => 'Equipment borrowing available', 'date' => $date]);
        }

        $override = EquipmentOverride::updateOrCreate(
            ['override_date' => $date],
            [
                'status'     => in_array($status, ['closed', 'maintenance']) ? $status : 'closed',
                'start_time' => $validated['start_time'] ?? '07:30',
                'end_time'   => $validated['end_time'] ?? '17:00',
                'notes'      => $validated['notes'] ?? 'Equipment borrowing closed by administrator',
                'created_by' => auth()->id(),
            ]
        );

        return response()->json(['message' => 'Equipment availability updated', 'data' => $override]);
    }

    /**
     * DELETE /general/venue-availability/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $override = VenueOverride::find($id);
        if ($override) {
            $override->delete();
        }

        return response()->json(['message' => 'Override removed'], 200);
    }
}
