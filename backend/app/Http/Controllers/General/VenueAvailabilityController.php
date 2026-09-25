<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\VenueOverride;
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

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->integer('venue_id'));
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

        $venueId = $request->integer('venue_id');
        $year    = $request->integer('year');
        $month   = $request->integer('month');

        $startDate = Carbon::create($year, $month, 1)->startOfDay();
        $endDate   = $startDate->copy()->endOfMonth();

        // 1. Fetch live overrides for this venue and month
        $overrides = VenueOverride::where('venue_id', $venueId)
            ->whereBetween('override_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->override_date)->toDateString();
            });

        // 2. Booking counts per day
        $bookingCounts = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->where('venue_bookings.venue_id', $venueId)
            ->whereNull('venue_bookings.archived_at')
            ->whereIn('tracking_numbers.status', ['approved', 'ongoing', 'on-going', 'reserved'])
            ->whereBetween('venue_bookings.date_of_usage', [$startDate->toDateString(), $endDate->toDateString()])
            ->select('venue_bookings.date_of_usage', DB::raw('count(*) as count'))
            ->groupBy('venue_bookings.date_of_usage')
            ->get()
            ->keyBy('date_of_usage');

        // 3. Build day-by-day map for the month
        $days = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $dateStr = $cursor->toDateString();
            $bookings = $bookingCounts[$dateStr]->count ?? 0;
            $override = $overrides[$dateStr] ?? null;

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
                'date'        => $dateStr,
                'status'      => $status,
                'bookings'    => $bookings,
                'notes'       => $notes,
                'start_time'  => $override->start_time ?? '07:30',
                'end_time'    => $override->end_time ?? '17:00',
                'override_id' => $override->id ?? null,
            ];

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
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'venue_id'      => 'required|exists:venues,id',
            'override_date' => 'required|date',
            'status'        => 'required|string',
            'start_time'    => 'nullable|string',
            'end_time'      => 'nullable|string',
            'notes'         => 'nullable|string|max:500',
            'reason'        => 'nullable|string|max:500',
        ]);

        $statusLower = strtolower($validated['status']);
        $dateFormatted = Carbon::parse($validated['override_date'])->toDateString();
        $notes = $validated['notes'] ?? $validated['reason'] ?? null;

        if ($statusLower === 'available') {
            VenueOverride::where('venue_id', $validated['venue_id'])
                ->where('override_date', $dateFormatted)
                ->delete();

            return response()->json([
                'message' => 'Venue status reset to available',
                'status'  => 'available',
                'date'    => $dateFormatted,
            ], 200);
        }

        $normalizedStatus = ($statusLower === 'damaged') ? 'maintenance' : $statusLower;
        if (!in_array($normalizedStatus, ['maintenance', 'closed'])) {
            $normalizedStatus = 'maintenance';
        }

        $override = VenueOverride::updateOrCreate(
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

        return response()->json([
            'message' => "Venue operating status updated to {$normalizedStatus}",
            'data'    => $override,
        ], 200);
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
