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
                    'location' => $v->location ?? $v->office?->name ?? 'FSUU Campus',
                    'capacity' => $v->capacity ?? 100,
                    'type'     => ($v->office?->slug === 'fsuu-morelos'
                        || str_contains(strtolower($v->name), 'studio')
                        || str_contains(strtolower($v->name), 'theater'))
                        ? 'sco' : 'avr',
                    'office'   => $v->office,
                ])
        );
    }

    /**
     * GET /public/equipment-types
     * Lists all equipment types for the public borrowing form with dynamic stock counts.
     */
    public function equipmentTypes(): JsonResponse
    {
        return response()->json(
            EquipmentType::with('office')
                ->withCount([
                    'equipmentUnits as calculated_total' => function ($q) {
                        $q->whereNull('archived_at');
                    },
                    'equipmentUnits as calculated_available' => function ($q) {
                        $q->whereNull('archived_at')->where('status', 'available');
                    }
                ])
                ->get()
                ->map(fn ($e) => [
                    'id'              => $e->id,
                    'name'            => $e->eq_name ?? 'Equipment',
                    'eq_name'         => $e->eq_name ?? 'Equipment',
                    'description'     => $e->description ?? $e->eq_type ?? 'Standard AV Gear',
                    'eq_type'         => $e->eq_type,
                    'barcode'         => $e->barcode,
                    'avatar'          => $e->avatar,
                    'total_quantity'  => (int)$e->calculated_total,
                    'available_count' => (int)$e->calculated_available,
                    'status'          => $e->status ?? 'available',
                    'office_id'       => $e->office_id,
                    'office'          => $e->office,
                    'dept'            => ($e->office?->slug === 'fsuu-morelos'
                        || str_contains(strtolower($e->eq_type ?? ''), 'broadcast'))
                        ? 'sco' : 'avr',
                    'category'        => $e->eq_type ?? (($e->office?->slug === 'fsuu-morelos'
                        || str_contains(strtolower($e->eq_type ?? ''), 'broadcast'))
                        ? 'SCO Equipment' : 'AVR Equipment'),
                ])
        );
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
