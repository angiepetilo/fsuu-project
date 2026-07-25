<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use App\Models\AvrVenueBooking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AvrVenueManageController extends Controller
{
    public function index(): JsonResponse
    {
        $venues = Venue::with('office')
            ->withCount(['equipmentTypes as equipment_types_count'])
            ->paginate(15);

        $venues->getCollection()->transform(fn($v) => [
            'id'          => $v->id,
            'name'        => $v->name,
            'location'    => $v->location,
            'capacity'    => $v->capacity,
            'is_active'   => $v->is_active,
            'office'      => $v->office?->only(['id', 'name', 'code', 'type']),
            'equipment_types_count' => $v->equipment_types_count,
            'image_url'   => $v->image_path ? url('storage/' . $v->image_path) : null,
        ]);

        return response()->json($venues);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'location'       => 'nullable|string',
            'capacity'       => 'nullable|integer|min:1',
            'office_id'      => 'nullable|exists:offices,id',
            'is_active'      => 'boolean',
            'external_price' => 'nullable|numeric',
            'image'          => 'nullable|image|max:2048',
        ]);

        $data['is_active'] = $data['is_active'] ?? true;
        
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('venues', 'public');
        }

        $venue = Venue::create($data);
        $venue->load('office');

        return response()->json($venue, 201);
    }

    public function update(Request $request, Venue $venue): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'location'       => 'nullable|string',
            'capacity'       => 'nullable|integer|min:1',
            'office_id'      => 'nullable|exists:offices,id',
            'is_active'      => 'boolean',
            'external_price' => 'nullable|numeric',
            'maintenance_dates' => 'nullable|array',
            'maintenance_dates.*' => 'date',
            'image'          => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('venues', 'public');
        }

        $venue->update($data);
        $venue->load('office');

        return response()->json($venue);
    }

    public function destroy(Venue $venue): JsonResponse
    {
        $venue->delete();
        return response()->json(['message' => 'Venue deleted.']);
    }

    /**
     * Return calendar events: venue bookings + maintenance days for the given month.
     */
    public function calendarEvents(Request $request): JsonResponse
    {
        $year  = $request->integer('year',  now()->year);
        $month = $request->integer('month', now()->month);
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end   = $start->copy()->endOfMonth()->endOfDay();

        $bookings = AvrVenueBooking::with('venue')
            ->whereBetween('start_datetime', [$start, $end])
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->get()
            ->map(fn($b) => [
                'id'         => $b->id,
                'type'       => 'booking',
                'title'      => $b->venue?->name ?? 'Venue',
                'start'      => $b->start_datetime->toIso8601String(),
                'end'        => $b->end_datetime->toIso8601String(),
                'status'     => $b->status,
                'requestor'  => $b->requestor_name,
                'venue_id'   => $b->venue_id,
            ]);

        $closures = \App\Models\VenueClosure::with('venue')
            ->whereBetween('start_time', [$start, $end])
            ->get()
            ->map(fn($c) => [
                'id'         => 'c-'.$c->id,
                'type'       => 'closure',
                'title'      => ($c->venue?->name ?? 'Venue') . ' (' . ucfirst($c->type) . ')',
                'start'      => $c->start_time->toIso8601String(),
                'end'        => $c->end_time->toIso8601String(),
                'status'     => 'completed', // maps to gray color in UI
                'requestor'  => 'System Admin',
                'venue_id'   => $c->venue_id,
            ]);

        return response()->json($bookings->concat($closures));
    }
}
