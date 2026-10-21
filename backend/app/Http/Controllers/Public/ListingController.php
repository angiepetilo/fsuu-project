<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ListingController extends Controller
{
    private function ensureSchema(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('venues')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'min_capacity')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->integer('min_capacity')->default(1)->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'max_capacity')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->integer('max_capacity')->default(100)->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'allowed_equipment')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->longText('allowed_equipment')->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('venues', 'equipment_max_qtys')) {
                    \Illuminate\Support\Facades\Schema::table('venues', function ($table) {
                        $table->longText('equipment_max_qtys')->nullable();
                    });
                }
            }
        } catch (\Throwable $e) {}
    }

    /**
     * GET /public/venues
     * Lists all active venues for the public booking form.
     */
    public function venues(): JsonResponse
    {
        $this->ensureSchema();
        return response()->json(
            Venue::where('status', '!=', 'maintenance')
                ->get()
                ->map(function ($v) {
                    $imgUrl = str_starts_with($v->avatar ?? '', '/storage/') ? url($v->avatar) : $v->avatar;
                    $allowed = $v->allowed_equipment;
                    if (is_string($allowed)) {
                        $allowed = json_decode($allowed, true) ?? [];
                    }
                    if (!is_array($allowed)) {
                        $allowed = [];
                    }
                    $maxQtys = $v->equipment_max_qtys;
                    if (is_string($maxQtys)) {
                        $maxQtys = json_decode($maxQtys, true) ?? [];
                    }
                    if (!is_array($maxQtys)) {
                        $maxQtys = [];
                    }
                    return [
                        'id'                 => $v->id,
                        'name'               => $v->name,
                        'avatar'             => $imgUrl,
                        'photo'              => $imgUrl,
                        'image'              => $imgUrl,
                        'location'           => $v->location ?? 'FSUU Campus',
                        'capacity'           => $v->capacity ?? 100,
                        'min_capacity'       => $v->min_capacity ?? 1,
                        'max_capacity'       => $v->max_capacity ?? $v->capacity ?? 100,
                        'type'               => 'avr',
                        'status'             => $v->status ?? 'Available',
                        'allowed_equipment'  => array_values(array_filter($allowed)),
                        'equipment_max_qtys' => $maxQtys,
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
        // Proactively clear expired reservations past grace period and check overdue alerts
        try {
            app(\App\Services\NoShowAutoReleaseService::class)->processNoShows();
            app(\App\Services\OverdueAndExceededAlertService::class)->processAlerts();
        } catch (\Throwable $e) {}

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

        // Gather all built-in child unit references to guarantee built-in units never count as available in public view
        $globalChildIds = [];
        $parentUnitsData = \App\Models\EquipmentUnit::whereNotNull('built_in_units')->whereNull('archived_at')->get(['id', 'built_in_units']);
        foreach ($parentUnitsData as $pu) {
            $raw = is_array($pu->built_in_units) ? $pu->built_in_units : json_decode($pu->built_in_units, true);
            if (is_array($raw)) {
                foreach ($raw as $ref) {
                    if (!empty($ref)) $globalChildIds[] = (string)$ref;
                }
            }
        }
        $globalChildIds = array_unique($globalChildIds);

        // Find parent unit IDs where ANY built-in child has damaged or lost status/condition
        // → those parents become Unavailable and must not count as available stock
        $parentIdsWithDamagedChildren = [];
        if (!empty($globalChildIds)) {
            // Get numeric IDs from refs (some refs may be barcode strings)
            $numericChildRefs = array_values(array_filter(array_map('intval', $globalChildIds), fn($id) => $id > 0));

            // Fetch all child units that are damaged or lost
            $damagedLostUnits = \App\Models\EquipmentUnit::whereNull('archived_at')
                ->where(function ($q) use ($numericChildRefs, $globalChildIds) {
                    if (!empty($numericChildRefs)) {
                        $q->whereIn('id', $numericChildRefs);
                    }
                    if (!empty($globalChildIds)) {
                        $q->orWhereIn('barcode', $globalChildIds)
                          ->orWhereIn('serial_number', $globalChildIds);
                    }
                })
                ->where(function ($q) {
                    $q->whereIn(\Illuminate\Support\Facades\DB::raw("LOWER(COALESCE(status, ''))"), ['damaged', 'lost', 'decommissioned'])
                      ->orWhereIn(\Illuminate\Support\Facades\DB::raw("LOWER(COALESCE(`condition`, ''))"), ['damaged', 'lost']);
                })
                ->get(['id', 'barcode', 'serial_number']);

            $damagedSet = [];
            foreach ($damagedLostUnits as $dUnit) {
                $damagedSet[] = (string)$dUnit->id;
                if (!empty($dUnit->barcode)) $damagedSet[] = (string)$dUnit->barcode;
                if (!empty($dUnit->serial_number)) $damagedSet[] = (string)$dUnit->serial_number;
            }
            $damagedSet = array_unique(array_filter($damagedSet));

            if (!empty($damagedSet)) {
                foreach ($parentUnitsData as $parent) {
                    $raw = is_array($parent->built_in_units) ? $parent->built_in_units : json_decode($parent->built_in_units, true);
                    if (!is_array($raw)) continue;
                    foreach ($raw as $childRef) {
                        if (empty($childRef)) continue;
                        if (in_array((string)$childRef, $damagedSet, true)) {
                            $parentIdsWithDamagedChildren[] = (int)$parent->id;
                            break; // one damaged child is enough to make parent unavailable
                        }
                    }
                }
                $parentIdsWithDamagedChildren = array_unique($parentIdsWithDamagedChildren);
            }
        }

        // If requested for equipment borrowing (default public view), filter by is_public = true
        // If context=venue_booking, allow all categories so venue-specific allowed equipment can still be requested
        $context = $request->query('context', 'borrowing');
        $query = EquipmentType::query();
        if ($context !== 'venue_booking' && \Illuminate\Support\Facades\Schema::hasColumn('equipment_types', 'is_public')) {
            $query->where('is_public', true);
        }

        $query->withCount([
                'equipmentUnits as calculated_total' => function ($q) {
                    $q->whereNull('archived_at');
                },
                'equipmentUnits as calculated_operational' => function ($q) {
                    $q->whereNull('archived_at')
                      ->whereRaw("LOWER(COALESCE(equipment_units.status, 'available')) NOT IN ('damaged', 'lost', 'decommissioned', 'maintenance')")
                      ->whereRaw("LOWER(COALESCE(equipment_units.condition, 'good')) NOT IN ('damaged', 'lost', 'under repair', 'under_repair')");
                },
                'equipmentUnits as calculated_available' => function ($q) use ($globalChildIds, $parentIdsWithDamagedChildren) {
                    $q->whereNull('archived_at')
                      ->whereRaw("LOWER(COALESCE(equipment_units.status, 'available')) NOT IN ('damaged', 'lost', 'decommissioned', 'maintenance', 'released', 'in_use', 'borrowed', 'in-use', 'reserved', 'unavailable', 'built-in', 'built_in')")
                      ->whereRaw("LOWER(COALESCE(equipment_units.condition, 'good')) NOT IN ('damaged', 'lost', 'under repair', 'under_repair', 'worn', 'minor wear')");
                    if (!empty($globalChildIds)) {
                        $numIds = array_values(array_filter(array_map('intval', $globalChildIds), fn($id) => $id > 0));
                        if (!empty($numIds)) {
                            $q->whereNotIn('equipment_units.id', $numIds);
                        }
                        // Use whereRaw to avoid the MySQL NULL NOT IN (...) trap:
                        // `NULL NOT IN (list)` evaluates to NULL (not TRUE), so units
                        // with null barcodes are silently excluded by whereNotIn().
                        // We must explicitly allow NULL barcodes to pass through.
                        $placeholders = implode(',', array_fill(0, count($globalChildIds), '?'));
                        $q->whereRaw("(equipment_units.barcode IS NULL OR equipment_units.barcode NOT IN ({$placeholders}))", array_values($globalChildIds));
                    }
                    // Exclude parent units that have damaged/lost built-in children
                    if (!empty($parentIdsWithDamagedChildren)) {
                        $q->whereNotIn('equipment_units.id', $parentIdsWithDamagedChildren);
                    }
                }
            ]);

        $allTypes = $query->get();

        // High-Performance Optimization: Pre-aggregate overlapping commitments in 2 single queries (eliminates N+1 DB roundtrips)
        $borrowCommittedMap = [];
        $venueCommittedMap = [];

        if ($dateStr && $startTimeStr && $endTimeStr) {
            $cleanDate = substr($dateStr, 0, 10);

            // 1. Single aggregated query for unreleased overlapping Equipment Borrow Items
            // Note: Ongoing items with assigned physical units are already physically marked as released in equipment_units,
            // so they are excluded from calculated_available. Untagged ongoing items and future unreleased reservations are deducted here.
            $rawBorrowItems = DB::table('equipment_borrow_items')
                ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('equipment_borrows.date_of_usage', '=', $cleanDate)
                ->where('equipment_borrows.time_start', '<', $endTimeStr)
                ->where('equipment_borrows.time_end', '>', $startTimeStr)
                ->where(function($q) {
                    $q->whereRaw("LOWER(COALESCE(tracking_numbers.status, 'pending')) NOT IN ('rejected', 'cancelled', 'completed', 'done', 'damaged', 'lost', 'ongoing', 'on-going', 'released', 'in_use', 'in-use', 'borrowed')")
                      ->orWhere(function($sub) {
                          $sub->whereIn(DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending'))"), ['ongoing', 'on-going', 'borrowed', 'released', 'in_use', 'in-use'])
                              ->where(function($inner) {
                                  $inner->whereNull('equipment_borrows.assigned_units')
                                        ->orWhere('equipment_borrows.assigned_units', '')
                                        ->orWhere('equipment_borrows.assigned_units', '[]')
                                        ->orWhere('equipment_borrows.assigned_units', '{}')
                                        ->orWhere('equipment_borrows.assigned_units', 'null');
                              });
                      });
                })
                ->select('equipment_borrow_items.equipment_type_id', DB::raw('SUM(equipment_borrow_items.quantity_requested) as total_qty'))
                ->groupBy('equipment_borrow_items.equipment_type_id')
                ->get();

            foreach ($rawBorrowItems as $bi) {
                $borrowCommittedMap[strtoupper(trim((string)$bi->equipment_type_id))] = (int)$bi->total_qty;
            }

            // 2. Single query for unreleased overlapping Venue Bookings
            $overlappingVenueBookings = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereRaw("LOWER(COALESCE(tracking_numbers.status, 'pending')) NOT IN ('rejected', 'cancelled', 'completed', 'done', 'damaged', 'lost', 'ongoing', 'on-going', 'released', 'in_use', 'in-use', 'borrowed')")
                ->where('venue_bookings.date_of_usage', '<=', $cleanDate)
                ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$cleanDate])
                ->where('venue_bookings.time_start', '<', $endTimeStr)
                ->where('venue_bookings.time_end', '>', $startTimeStr)
                ->select('venue_bookings.id', 'venue_bookings.equipment_notes', 'venue_bookings.assigned_units')
                ->get();

            $vbIds = $overlappingVenueBookings->pluck('id')->toArray();
            $structVenueItems = collect();
            if (!empty($vbIds) && \Illuminate\Support\Facades\Schema::hasTable('venue_booking_equipment')) {
                $structVenueItems = DB::table('venue_booking_equipment')
                    ->whereIn('venue_booking_id', $vbIds)
                    ->get();
            }

            // Populate venue committed count per equipment type (avoid double-counting structured items + notes on same booking)
            foreach ($allTypes as $eType) {
                $typeKeys = [
                    strtoupper(trim((string)$eType->id)),
                    strtoupper(trim((string)($eType->name ?? ''))),
                    strtoupper(trim((string)($eType->eq_name ?? ''))),
                ];
                $totalForType = 0;

                foreach ($overlappingVenueBookings as $vb) {
                    $bookingDemand = 0;

                    // A. Structured items in venue_booking_equipment
                    $matchingStruct = $structVenueItems->where('venue_booking_id', $vb->id)->filter(function ($svi) use ($typeKeys) {
                        return in_array(strtoupper(trim((string)$svi->equipment_type_id)), $typeKeys, true);
                    });
                    if ($matchingStruct->isNotEmpty()) {
                        $bookingDemand = (int)$matchingStruct->sum('quantity_requested');
                    }

                    // B. Fallback to equipment_notes text if no structured items found
                    if ($bookingDemand === 0 && !empty($vb->equipment_notes)) {
                        $eqText = strtoupper($vb->equipment_notes);
                        $typeName = strtoupper($eType->name ?? $eType->eq_name ?? '');
                        if ($typeName && str_contains($eqText, $typeName)) {
                            if (preg_match('/\b' . preg_quote($typeName, '/') . '\s*\(Qty:\s*(\d+)\)/i', $eqText, $m)) {
                                $bookingDemand = (int)$m[1];
                            } elseif (preg_match('/\b' . preg_quote($typeName, '/') . '\b/i', $eqText)) {
                                $bookingDemand = 1;
                            }
                        }
                    }

                    $totalForType += $bookingDemand;
                }

                $venueCommittedMap[strtoupper(trim((string)$eType->id))] = $totalForType;
            }
        }

        $equipmentTypes = $allTypes->map(function ($e) use ($borrowCommittedMap, $venueCommittedMap, $dateStr, $startTimeStr, $endTimeStr) {
            $total = (int)($e->calculated_total ?? 0);
            $operational = (int)($e->calculated_operational ?? 0);
            $availableNow = (int)($e->calculated_available ?? 0);

            $typeKey = strtoupper(trim((string)$e->id));
            $typeNameKey = strtoupper(trim((string)($e->name ?? $e->eq_name ?? '')));

            $borrowCommitted = $borrowCommittedMap[$typeKey] ?? $borrowCommittedMap[$typeNameKey] ?? 0;
            $venueCommitted = $venueCommittedMap[$typeKey] ?? 0;

            $totalCommitted = $borrowCommitted + $venueCommitted;

            // Available stock = lendable units minus active commitments for the requested time slot.
            // We use $availableNow as the base (it already excludes built-in, damaged, reserved, etc.)
            // and simply subtract overlapping borrowing/venue commitments from it.
            // NOTE: We must NOT use ($operational - $totalCommitted) because $operational
            // includes built-in child units, which inflates the base and causes the
            // borrow page to show 0 when the Reports page shows 5 (or vice versa).
            if ($dateStr && $startTimeStr && $endTimeStr) {
                $avail = max(0, $availableNow - $totalCommitted);
            } else {
                $avail = $availableNow;
            }

            $rawBuilt = $e->built_in_units;
            if (is_string($rawBuilt)) {
                $rawBuilt = json_decode($rawBuilt, true) ?: [];
            }
            $builtInUnits = is_array($rawBuilt) ? array_values(array_filter($rawBuilt, fn($v) => !empty($v))) : [];

            $photoUrl = $e->photo ?? $e->avatar;
            return [
                'id'              => $e->id,
                'name'            => $e->eq_name ?? 'Equipment',
                'category'        => $e->eq_name ?? 'Equipment',
                'eq_name'         => $e->eq_name ?? 'Equipment',
                'brand'           => $e->brand,
                'description'     => $e->description ?? 'Standard AV Gear',
                'avatar'          => $e->avatar,
                'photo'           => $photoUrl,
                'image'           => $photoUrl,
                'photo_url'       => $photoUrl,
                'photo_fit'       => $e->photo_fit ?? 'contain',
                'photo_scale'     => (int)($e->photo_scale ?? 100),
                'updated_at'      => $e->updated_at,
                'total_quantity'  => $total,
                'present_count'   => $operational,
                'available_count' => $avail,
                'in_use_count'    => (int)$borrowCommitted,
                'reserved_count'  => (int)$venueCommitted,
                'status'          => $avail > 0 ? 'available' : 'unavailable',
                'dept'            => 'avr',
                'built_in_units'  => $builtInUnits,
                'built_in_names'  => $e->built_in_names ?? [],
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
        try {
            app(\App\Services\NoShowAutoReleaseService::class)->processNoShows();
            app(\App\Services\OverdueAndExceededAlertService::class)->processAlerts();
        } catch (\Throwable $e) {}

        $bookings = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereIn('tracking_numbers.status', ['pending', 'approved', 'ongoing', 'on-going', 'reserved'])
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
