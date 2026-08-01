<?php

namespace App\Http\Controllers;

use App\Models\VenueAvailabilityOverride;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueAvailabilityController extends Controller
{
    /**
     * GET /admin/venue-availability?venue_id=&year=&month=
     * Returns override statuses + computed booking density for a venue/month.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'venue_id' => 'required|exists:venues,id',
            'year'     => 'required|integer',
            'month'    => 'required|integer|between:1,12',
        ]);

        $venueId = $request->integer('venue_id');
        $year    = $request->integer('year');
        $month   = $request->integer('month');

        $startDate = Carbon::create($year, $month, 1)->startOfDay();
        $endDate   = $startDate->copy()->endOfMonth();

        // Manual overrides (maintenance, closed)
        $overrides = VenueAvailabilityOverride::where('venue_id', $venueId)
            ->whereBetween('override_date', [$startDate, $endDate])
            ->get()
            ->keyBy(fn ($o) => $o->override_date->toDateString());

        // Booking counts per day
        $bookingCounts = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->where('venue_bookings.venue_id', $venueId)
            ->whereNull('venue_bookings.archived_at')
            ->whereIn('tracking_numbers.status', ['pending', 'approved', 'ongoing'])
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
            $override = $overrides[$dateStr] ?? null;
            $bookings = $bookingCounts[$dateStr]->count ?? 0;

            if ($override) {
                $status = $override->status; // maintenance | closed | available
            } elseif ($bookings === 0) {
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
                'notes'    => $override?->notes,
            ];

            $cursor->addDay();
        }

        return response()->json(array_values($days));
    }

    /**
     * GET /admin/venues-list — returns all venues scoped to the admin's office
     */
    public function venuesList(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Venue::with('office')->orderBy('name');

        if (!$user->isSuperAdmin()) {
            $query->where('office_id', $user->office_id);
        }

        return response()->json($query->get());
    }

    /**
     * POST /admin/venue-availability — set override for a specific date
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'venue_id'      => 'required|exists:venues,id',
            'override_date' => 'required|date',
            'status'        => 'required|in:available,maintenance,closed,partial',
            'notes'         => 'nullable|string|max:255',
        ]);

        $override = VenueAvailabilityOverride::updateOrCreate(
            ['venue_id' => $data['venue_id'], 'override_date' => $data['override_date']],
            ['status' => $data['status'], 'notes' => $data['notes'] ?? null]
        );

        return response()->json($override, 201);
    }

    /**
     * DELETE /admin/venue-availability/{id} — remove a date override
     */
    public function destroy(int $id): JsonResponse
    {
        VenueAvailabilityOverride::findOrFail($id)->delete();

        return response()->json(['message' => 'Override removed']);
    }
}
