<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueAvailabilityController extends Controller
{
    public function publicOverrides(): JsonResponse
    {
        return response()->json([]);
    }

    /**
     * GET /general/venue-availability?venue_id=&year=&month=
     * Returns computed booking density for a venue/month.
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

        // Booking counts per day
        $bookingCounts = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->where('venue_bookings.venue_id', $venueId)
            ->whereNull('venue_bookings.archived_at')
            ->whereIn('tracking_numbers.status', ['approved', 'ongoing', 'on-going'])
            ->whereBetween('venue_bookings.date_of_usage', [$startDate->toDateString(), $endDate->toDateString()])
            ->select('venue_bookings.date_of_usage', DB::raw('count(*) as count'))
            ->groupBy('venue_bookings.date_of_usage')
            ->get()
            ->keyBy('date_of_usage');

        // Build day-by-day map for the month
        $days = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $dateStr = $cursor->toDateString();
            $bookings = $bookingCounts[$dateStr]->count ?? 0;

            if ($bookings === 0) {
                $status = 'available';
            } elseif ($bookings >= 3) {
                $status = 'fully_booked';
            } else {
                $status = 'partial';
            }

            $days[$dateStr] = [
                'date'     => $dateStr,
                'status'   => $status,
                'bookings' => $bookings,
                'notes'    => null,
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
     * POST /general/venue-availability — placeholder stub
     */
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Venue schedule updated'], 200);
    }

    /**
     * DELETE /general/venue-availability/{id} — placeholder stub
     */
    public function destroy(int $id): JsonResponse
    {
        return response()->json(['message' => 'Override removed'], 200);
    }
}
