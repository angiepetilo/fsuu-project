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

        $equipmentTypes = $query->get()
            ->map(function ($e) use ($dateStr, $startTimeStr, $endTimeStr) {
                $hasRegisteredUnits = $e->calculated_total > 0;
                $total = (int)($hasRegisteredUnits ? $e->calculated_total : ($e->total_quantity ?? 0));
                $operational = (int)($hasRegisteredUnits ? $e->calculated_operational : ($e->total_quantity ?? 0));
                $avail = (int)($hasRegisteredUnits ? $e->calculated_available : $operational);

                $matchTypeIds = [$e->id, $e->eq_name, $e->name, $e->eq_type];

                if ($dateStr && $startTimeStr && $endTimeStr) {
                    $cleanDate = substr($dateStr, 0, 10);

                    // 1. Calculate Equipment Borrowings overlapping this time slot
                    $borrowCommitted = \App\Models\EquipmentBorrowItem::whereIn('equipment_type_id', $matchTypeIds)
                        ->whereHas('equipmentBorrow', function ($query) use ($cleanDate, $startTimeStr, $endTimeStr) {
                            $query->whereHas('trackingNumber', function ($t) {
                                    $t->whereNotIn('status', ['rejected', 'cancelled', 'completed', 'done']);
                                })
                                ->where(function($sub) use ($cleanDate, $startTimeStr, $endTimeStr) {
                                    $sub->where(function($dq) use ($cleanDate) {
                                        $dq->whereDate('date_of_usage', $cleanDate)
                                           ->orWhere('date_of_usage', 'like', "{$cleanDate}%");
                                    })
                                    ->where('time_start', '<', $endTimeStr)
                                    ->where('time_end', '>', $startTimeStr);
                                });
                        })
                        ->sum('quantity_requested');

                    // 2. Calculate Venue Bookings overlapping this date & time slot
                    $venueCommitted = \App\Models\VenueBooking::whereHas('trackingNumber', function ($t) {
                            $t->whereNotIn('status', ['rejected', 'cancelled', 'completed', 'done']);
                        })
                        ->where(function($dq) use ($cleanDate) {
                            $dq->whereDate('date_of_usage', $cleanDate)
                               ->orWhere('date_of_usage', 'like', "{$cleanDate}%");
                        })
                        ->where('time_start', '<', $endTimeStr)
                        ->where('time_end', '>', $startTimeStr)
                        ->get()
                        ->sum(function ($vb) use ($e, $matchTypeIds) {
                            if (\Illuminate\Support\Facades\Schema::hasTable('venue_booking_equipment')) {
                                $structItems = DB::table('venue_booking_equipment')
                                    ->where('venue_booking_id', $vb->id)
                                    ->get();
                                if ($structItems->count() > 0) {
                                    return (int) $structItems->whereIn('equipment_type_id', $matchTypeIds)->sum('quantity_requested');
                                }
                            }

                            $eqText = strtoupper(($vb->equipment_notes ?? '') . ' ' . ($vb->equipment_needed ?? '') . ' ' . json_encode($vb->assigned_units ?? []));
                            $typeName = strtoupper($e->name ?? $e->eq_name ?? '');
                            if ($typeName && str_contains($eqText, $typeName)) {
                                preg_match('/\d+/', $eqText, $m);
                                return isset($m[0]) ? (int)$m[0] : 1;
                            }
                            return 0;
                        });

                    $totalCommitted = $borrowCommitted + $venueCommitted;
                    $avail = max(0, $operational - $totalCommitted);
                } else {
                    $borrowCommitted = 0;
                    $venueCommitted = 0;
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
                    'present_count'   => $operational,
                    'available_count' => $avail,
                    'in_use_count'    => (int)$borrowCommitted,
                    'reserved_count'  => (int)$venueCommitted,
                    'status'          => $avail > 0 ? 'available' : 'unavailable',
                    'dept'            => 'avr',
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
                'venue_bookings.reservation_end_date',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'tracking_numbers.status'
            )
            ->get();

        return response()->json($bookings);
    }
}
