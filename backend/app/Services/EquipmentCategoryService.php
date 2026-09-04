<?php

namespace App\Services;

use App\Models\EquipmentType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EquipmentCategoryService
{
    /**
     * Compute comprehensive stock statistics in batch for a collection of categories (High performance: 3 grouped queries total).
     */
    public function formatBatchCategoriesResponse($types): array
    {
        $typesArray = is_array($types) ? $types : $types->all();
        if (empty($typesArray)) {
            return [];
        }

        $typeIds = array_map(fn($t) => $t->id, $typesArray);
        $typeMap = [];
        foreach ($typesArray as $t) {
            $typeMap[$t->id] = $t;
        }

        self::autoSyncUnitConditions();

        // 1. Grouped physical units statistics
        $unitsStats = [];
        if (Schema::hasTable('equipment_units')) {
            try {
                $rawUnits = DB::table('equipment_units')
                    ->whereIn('equipment_type_id', $typeIds)
                    ->whereNull('archived_at')
                    ->select(
                        'equipment_type_id',
                        DB::raw('COUNT(*) as total_registered'),
                        DB::raw("SUM(CASE WHEN LOWER(status) IN ('released', 'in_use', 'borrowed', 'in-use') THEN 1 ELSE 0 END) as physical_released"),
                        DB::raw("SUM(CASE WHEN LOWER(status) = 'reserved' THEN 1 ELSE 0 END) as physical_reserved"),
                        DB::raw("SUM(CASE WHEN (LOWER(status) IN ('damaged', 'maintenance', 'unavailable') OR LOWER(COALESCE(condition, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair')) AND LOWER(COALESCE(condition, 'good')) NOT IN ('lost', 'decommissioned') AND LOWER(COALESCE(status, 'available')) NOT IN ('lost', 'decommissioned') THEN 1 ELSE 0 END) as physical_damaged"),
                        DB::raw("SUM(CASE WHEN LOWER(status) IN ('decommissioned', 'lost') OR LOWER(COALESCE(condition, '')) = 'lost' THEN 1 ELSE 0 END) as physical_lost")
                    )
                    ->groupBy('equipment_type_id')
                    ->get();

                foreach ($rawUnits as $row) {
                    $unitsStats[$row->equipment_type_id] = [
                        'total'    => (int) $row->total_registered,
                        'released' => (int) $row->physical_released,
                        'reserved' => (int) $row->physical_reserved,
                        'damaged'  => (int) $row->physical_damaged,
                        'lost'     => (int) $row->physical_lost,
                    ];
                }
            } catch (\Throwable $th) {}
        }

        $today = now()->toDateString();

        // 2. Grouped equipment borrowings statistics (Filtered to today's active schedule or currently checked out)
        $borrowStats = [];
        if (Schema::hasTable('equipment_borrow_items') && Schema::hasTable('equipment_borrows')) {
            try {
                $rawBorrows = DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(function($q) use ($today) {
                        $q->where(DB::raw("COALESCE(equipment_borrows.date_of_usage, CURRENT_DATE)"), '>=', $today)
                          ->orWhereIn(DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending'))"), ['on-going', 'ongoing', 'borrowed', 'released', 'in_use', 'in-use']);
                    })
                    ->select(
                        'equipment_borrow_items.equipment_type_id',
                        DB::raw("SUM(CASE WHEN LOWER(COALESCE(tracking_numbers.status, 'pending')) IN ('on-going', 'ongoing', 'borrowed', 'released', 'in_use', 'in-use') THEN equipment_borrow_items.quantity_requested ELSE 0 END) as released_sum"),
                        DB::raw("SUM(CASE WHEN LOWER(COALESCE(tracking_numbers.status, 'pending')) IN ('pending', 'scheduled', 'reserved', 'approved') THEN equipment_borrow_items.quantity_requested ELSE 0 END) as reserved_sum")
                    )
                    ->groupBy('equipment_borrow_items.equipment_type_id')
                    ->get();

                foreach ($rawBorrows as $row) {
                    $borrowStats[$row->equipment_type_id] = [
                        'released' => (int) $row->released_sum,
                        'reserved' => (int) $row->reserved_sum,
                    ];
                }
            } catch (\Throwable $th) {}
        }

        // 3. Active venue bookings for equipment extraction
        $venueList = [];
        if (Schema::hasTable('venue_bookings')) {
            try {
                $venueList = DB::table('venue_bookings')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->select('venue_bookings.id', 'venue_bookings.equipment_notes', 'venue_bookings.date_of_usage', 'venue_bookings.reservation_end_date', DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending')) as current_status"))
                    ->get();
            } catch (\Throwable $th) {}
        }

        $results = [];
        foreach ($typesArray as $e) {
            $u = $unitsStats[$e->id] ?? ['total' => 0, 'released' => 0, 'reserved' => 0, 'damaged' => 0, 'lost' => 0];
            $b = $borrowStats[$e->id] ?? ['released' => 0, 'reserved' => 0];

            // Also check if borrow items mapped by name/category or string ID
            if ($e->eq_name && isset($borrowStats[$e->eq_name])) {
                $b['released'] += $borrowStats[$e->eq_name]['released'];
                $b['reserved'] += $borrowStats[$e->eq_name]['reserved'];
            }
            if (isset($borrowStats[(string)$e->id])) {
                $b['released'] = max($b['released'], $borrowStats[(string)$e->id]['released']);
                $b['reserved'] = max($b['reserved'], $borrowStats[(string)$e->id]['reserved']);
            }

            // Venue items
            $venueReleased = 0;
            $venueReserved = 0;
            foreach ($venueList as $vb) {
                $cnt = $this->calculateVenueEquipmentCount($vb, $e);
                if ($cnt > 0) {
                    $start = !empty($vb->date_of_usage) ? substr($vb->date_of_usage, 0, 10) : $today;
                    $end = !empty($vb->reservation_end_date) ? substr($vb->reservation_end_date, 0, 10) : $start;
                    $isUpcomingOrActive = ($end >= $today) || in_array($vb->current_status, ['on-going', 'ongoing', 'in_use', 'in-use']);

                    if (in_array($vb->current_status, ['on-going', 'ongoing', 'in_use', 'in-use'])) {
                        $venueReleased += $cnt;
                    } elseif ($isUpcomingOrActive && in_array($vb->current_status, ['pending', 'scheduled', 'reserved', 'approved'])) {
                        $venueReserved += $cnt;
                    }
                }
            }

            $bookingReleased = $b['released'] + $venueReleased;
            $bookingReserved = $b['reserved'] + $venueReserved;

            if (isset($unitsStats[$e->id])) {
                $releasedTotal = max($u['released'], $bookingReleased);
                $reservedTotal = max($u['reserved'], $bookingReserved);
                $damagedCount = $u['damaged'];
                $lostCount = $u['lost'];
                $totalQty = $u['total'];
            } else {
                $releasedTotal = 0;
                $reservedTotal = 0;
                $damagedCount = 0;
                $lostCount = 0;
                $totalQty = 0;
            }

            $presentCount = max(0, $totalQty - $releasedTotal - $damagedCount - $lostCount);
            $reservedCapped = min($presentCount, $reservedTotal);

            $results[] = [
                'id'              => $e->id,
                'name'            => $e->eq_name,
                'category'        => $e->eq_name,
                'eq_name'         => $e->eq_name,
                'brand'           => $e->brand,
                'barcode'         => $e->barcode,
                'avatar'          => $e->avatar,
                'total_quantity'  => $totalQty,
                'present_count'   => $presentCount,
                'available_count' => $presentCount,
                'released_count'  => $releasedTotal,
                'reserved_count'  => $reservedCapped,
                'damaged_count'   => $damagedCount,
                'lost_count'      => $lostCount,
                'date_purchased'  => $e->date_purchased,
                'lifespan_years'  => $e->lifespan_years ?? 5,
                'status'          => $e->status ?? 'available',
                'description'     => $e->description,
                'created_at'      => $e->created_at,
            ];
        }

        return $results;
    }

    /**
     * Compute comprehensive stock statistics (borrowed, venue allocated, reserved, damaged, lost, available)
     */
    public function formatCategoryResponse(EquipmentType $e): array
    {
        $today = now()->toDateString();
        $hasUnitsTable = Schema::hasTable('equipment_units');
        $registeredUnitsCount = 0;
        $physicalReleased = 0;
        $damagedCount = 0;
        $lostCount = 0;
        $reservedCount = 0;

        if ($hasUnitsTable) {
            try {
                $registeredUnitsCount = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->count();

                $physicalReleased = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->whereIn(DB::raw('LOWER(status)'), ['released', 'in_use', 'borrowed'])
                    ->count();

                $reservedCount = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->where(DB::raw('LOWER(status)'), 'reserved')
                    ->count();

                $damagedCount = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->where(function($q) {
                        $q->where(function($sub) {
                            $sub->whereIn(DB::raw('LOWER(`status`)'), ['damaged', 'maintenance', 'unavailable'])
                                ->orWhereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'maintenance', 'worn', 'under repair']);
                        })
                        ->whereNotIn(DB::raw("LOWER(COALESCE(`condition`, 'good'))"), ['lost', 'decommissioned'])
                        ->whereNotIn(DB::raw("LOWER(COALESCE(`status`, 'available'))"), ['lost', 'decommissioned']);
                    })
                    ->count();

                $lostCount = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw('LOWER(status)'), ['decommissioned', 'lost'])
                          ->orWhereIn(DB::raw("LOWER(COALESCE(condition, ''))"), ['lost']);
                    })
                    ->count();
            } catch (\Throwable $th) {}
        }

        // 1. Calculate units released & reserved in equipment borrowings
        $borrowedCount = 0;
        $approvedBorrowCount = 0;
        try {
            if (Schema::hasTable('equipment_borrow_items') && Schema::hasTable('equipment_borrows')) {
                $borrowTypeIds = array_values(array_unique(array_filter([$e->id, (string)$e->id, $e->eq_name, $e->name, $e->category])));

                $borrowedCount = (int) DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', function($join) {
                        $join->on('equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id');
                    })
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->where(function($q) use ($e, $borrowTypeIds) {
                        $q->whereIn('equipment_borrow_items.equipment_type_id', $borrowTypeIds)
                          ->orWhere('equipment_borrow_items.equipment_type_id', '=', $e->id);
                    })
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending'))"), ['on-going', 'ongoing', 'borrowed', 'released', 'in_use', 'in-use']);
                    })
                    ->sum('equipment_borrow_items.quantity_requested');

                $approvedBorrowCount = (int) DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', function($join) {
                        $join->on('equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id');
                    })
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->where(function($q) use ($e, $borrowTypeIds) {
                        $q->whereIn('equipment_borrow_items.equipment_type_id', $borrowTypeIds)
                          ->orWhere('equipment_borrow_items.equipment_type_id', '=', $e->id);
                    })
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(function($q) use ($today) {
                        $q->where(DB::raw("COALESCE(equipment_borrows.date_of_usage, CURRENT_DATE)"), '>=', $today);
                    })
                    ->where(function($q) {
                        $q->whereIn(DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending'))"), ['pending', 'scheduled', 'reserved', 'approved']);
                    })
                    ->sum('equipment_borrow_items.quantity_requested');
            }
        } catch (\Throwable $th) {
            $borrowedCount = 0;
            $approvedBorrowCount = 0;
        }

        // 2. Calculate units released & reserved in venue bookings
        $venueCount = 0;
        $approvedVenueCount = 0;
        try {
            if (Schema::hasTable('venue_bookings')) {
                $activeVbs = DB::table('venue_bookings')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending'))"), ['on-going', 'ongoing', 'in_use', 'in-use']);
                    })
                    ->select('venue_bookings.id', 'venue_bookings.equipment_notes')
                    ->get();

                $venueCount = $activeVbs->sum(fn($vb) => $this->calculateVenueEquipmentCount($vb, $e));

                $approvedVbs = DB::table('venue_bookings')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->where(function($q) use ($today) {
                        $q->where(DB::raw("COALESCE(venue_bookings.date_of_usage, CURRENT_DATE)"), '<=', $today)
                          ->where(DB::raw("COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage, CURRENT_DATE)"), '>=', $today);
                    })
                    ->where(function($q) {
                        $q->whereIn(DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending'))"), ['pending', 'scheduled', 'reserved', 'approved']);
                    })
                    ->select('venue_bookings.id', 'venue_bookings.equipment_notes')
                    ->get();

                $approvedVenueCount = $approvedVbs->sum(fn($vb) => $this->calculateVenueEquipmentCount($vb, $e));
            }
        } catch (\Throwable $th) {
            $venueCount = 0;
            $approvedVenueCount = 0;
        }

        $bookingReleased = (int) ($borrowedCount + $venueCount);
        $bookingReserved = (int) ($approvedBorrowCount + $approvedVenueCount);

        if ($registeredUnitsCount > 0) {
            $releasedTotal = max($physicalReleased, $bookingReleased);
            $reservedTotal = max($reservedCount, $bookingReserved);
            $totalQty = $registeredUnitsCount;
        } else {
            $releasedTotal = 0;
            $reservedTotal = 0;
            $damagedCount = 0;
            $lostCount = 0;
            $totalQty = 0;
        }

        // Physical units currently sitting on the shelf (Total - Checked Out/Released - Damaged - Lost)
        $presentCount = max(0, $totalQty - $releasedTotal - $damagedCount - $lostCount);
        $reservedCapped = min($presentCount, $reservedTotal);

        return [
            'id'              => $e->id,
            'name'            => $e->eq_name,
            'category'        => $e->eq_name,
            'eq_name'         => $e->eq_name,
            'brand'           => $e->brand,
            'barcode'         => $e->barcode,
            'avatar'          => $e->avatar,
            'total_quantity'  => $totalQty,
            'present_count'   => $presentCount,
            'available_count' => $presentCount,
            'released_count'  => $releasedTotal,
            'reserved_count'  => $reservedCapped,
            'damaged_count'   => $damagedCount,
            'lost_count'      => $lostCount,
            'date_purchased'  => $e->date_purchased,
            'lifespan_years'  => $e->lifespan_years ?? 5,
            'status'          => $e->status ?? 'available',
            'description'     => $e->description,
            'created_at'      => $e->created_at,
        ];
    }

    /**
     * Helper to compute requested equipment quantity for a specific venue booking.
     */
    private function calculateVenueEquipmentCount(object $vb, EquipmentType $e): int
    {
        $count = 0;
        if (Schema::hasTable('venue_booking_equipment')) {
            try {
                $structItems = DB::table('venue_booking_equipment')
                    ->where('venue_booking_id', $vb->id)
                    ->get();

                foreach ($structItems as $item) {
                    if ((int)$item->equipment_type_id === (int)$e->id ||
                        strcasecmp((string)($item->others_specify ?? ''), (string)$e->eq_name) === 0) {
                        $count += (int) $item->quantity_requested;
                    }
                }
            } catch (\Throwable $t) {}
        }

        $eqRaw = $vb->equipment_notes ?? '';
        if (is_string($eqRaw) && !empty($eqRaw)) {
            if (str_starts_with(trim($eqRaw), '[') || str_starts_with(trim($eqRaw), '{')) {
                try {
                    $json = json_decode($eqRaw, true);
                    if (is_array($json)) {
                        foreach ($json as $jItem) {
                            $jName = $jItem['name'] ?? $jItem['category'] ?? $jItem['eq_name'] ?? '';
                            $jId = $jItem['id'] ?? $jItem['equipment_type_id'] ?? null;
                            $jQty = (int)($jItem['quantity'] ?? $jItem['quantity_requested'] ?? $jItem['qty'] ?? 1);
                            if ((int)$jId === (int)$e->id || (strtolower(trim($jName)) === strtolower(trim($e->eq_name)))) {
                                $count = max($count, $jQty);
                            }
                        }
                    }
                } catch (\Throwable $t) {}
            }

            $typeName = preg_quote($e->eq_name ?? $e->name ?? '', '/');
            if ($typeName && preg_match('/' . $typeName . '[^\d]*(\d+)/i', $eqRaw, $m)) {
                $count = max($count, (int)$m[1]);
            } elseif ($typeName && stripos($eqRaw, $e->eq_name) !== false) {
                $count = max($count, 1);
            }
        }

        return $count;
    }

    /**
     * Case-insensitive exact match check.
     */
    public function hasDuplicateName(string $name, ?int $excludeId = null): bool
    {
        $norm = strtolower(trim($name));
        return EquipmentType::where(DB::raw('LOWER(TRIM(eq_name))'), $norm)
            ->when($excludeId, function($q) use ($excludeId) {
                $q->where('id', '!=', $excludeId);
            })
            ->exists();
    }

    /**
     * Synchronize physical unit status/condition from active assignments and completed inspections.
     */
    public static function autoSyncUnitConditions(): void
    {
        try {
            if (!Schema::hasTable('equipment_units')) {
                return;
            }

            // 1. Sync damaged / lost statuses from inspections
            if (Schema::hasTable('inspections')) {
                $inspections = DB::table('inspections')
                    ->whereNotNull('unit_conditions')
                    ->select('unit_conditions', 'assigned_units', 'condition')
                    ->get();

                foreach ($inspections as $insp) {
                    $rawConds = $insp->unit_conditions;
                    if (is_string($rawConds)) {
                        $rawConds = json_decode($rawConds, true);
                    }
                    $assigned = $insp->assigned_units;
                    if (is_string($assigned)) {
                        $assigned = json_decode($assigned, true);
                    }
                    if (!is_array($rawConds)) continue;

                    foreach ($rawConds as $k => $cVal) {
                        $cStr = strtolower(is_array($cVal) ? ($cVal['condition'] ?? $cVal['status'] ?? '') : (string)$cVal);
                        if ($cStr === 'lost' || $cStr === 'damaged') {
                            $uStatus = 'unavailable';
                            $uCond = $cStr === 'lost' ? 'Lost' : 'Damaged';
                            $uBar = is_array($assigned) ? ($assigned[$k] ?? null) : null;
                            $keys = array_filter(array_unique([$k, $uBar]));

                            if (!empty($keys)) {
                                $nIds = array_values(array_filter($keys, fn($v) => is_numeric($v) && (int)$v > 0));
                                $uCodes = array_values(array_filter($keys, fn($v) => !empty($v)));

                                DB::table('equipment_units')
                                    ->where(function($q) use ($uCodes, $nIds) {
                                        $q->whereIn('barcode', $uCodes);
                                        if (!empty($nIds)) {
                                            $q->orWhereIn('id', array_map('intval', $nIds));
                                        }
                                    })
                                    ->update(['status' => $uStatus, 'condition' => $uCond, 'updated_at' => now()]);
                            }
                        }
                    }
                }
            }

            // 2. Collect all active assigned barcodes from equipment borrows and venue bookings
            $releasedBarcodes = [];
            $reservedBarcodes = [];

            // A. From equipment_borrows
            if (Schema::hasTable('equipment_borrows')) {
                $activeEquipBorrows = DB::table('equipment_borrows')
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('equipment_borrows.archived_at')
                    ->whereNotNull('equipment_borrows.assigned_units')
                    ->select(
                        'equipment_borrows.assigned_units',
                        DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending')) as current_status")
                    )
                    ->get();

                foreach ($activeEquipBorrows as $row) {
                    $units = $row->assigned_units;
                    if (is_string($units)) {
                        $units = json_decode($units, true);
                    }
                    if (is_array($units)) {
                        foreach ($units as $val) {
                            $code = trim((string)$val);
                            if ($code && $code !== '—' && $code !== '-') {
                                if (in_array($row->current_status, ['on-going', 'ongoing', 'borrowed', 'released', 'in_use', 'in-use'])) {
                                    $releasedBarcodes[] = $code;
                                } elseif (in_array($row->current_status, ['pending', 'scheduled', 'reserved', 'approved'])) {
                                    $reservedBarcodes[] = $code;
                                }
                            }
                        }
                    }
                }
            }

            // B. From venue_bookings
            if (Schema::hasTable('venue_bookings')) {
                $activeVenueBookings = DB::table('venue_bookings')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->whereNotNull('venue_bookings.assigned_units')
                    ->select(
                        'venue_bookings.assigned_units',
                        DB::raw("LOWER(COALESCE(tracking_numbers.status, 'pending')) as current_status")
                    )
                    ->get();

                foreach ($activeVenueBookings as $row) {
                    $units = $row->assigned_units;
                    if (is_string($units)) {
                        $units = json_decode($units, true);
                    }
                    if (is_array($units)) {
                        foreach ($units as $val) {
                            $code = trim((string)$val);
                            if ($code && $code !== '—' && $code !== '-') {
                                if (in_array($row->current_status, ['on-going', 'ongoing', 'borrowed', 'released', 'in_use', 'in-use'])) {
                                    $releasedBarcodes[] = $code;
                                } elseif (in_array($row->current_status, ['pending', 'scheduled', 'reserved', 'approved'])) {
                                    $reservedBarcodes[] = $code;
                                }
                            }
                        }
                    }
                }
            }

            $releasedBarcodes = array_unique($releasedBarcodes);
            $reservedBarcodes = array_diff(array_unique($reservedBarcodes), $releasedBarcodes);

            // 3. Mark released physical units
            if (!empty($releasedBarcodes)) {
                $relNumIds = array_values(array_filter($releasedBarcodes, fn($v) => is_numeric($v) && (int)$v > 0));
                $relCodes = array_values(array_filter($releasedBarcodes, fn($v) => !empty($v)));

                DB::table('equipment_units')
                    ->where(function($q) use ($relCodes, $relNumIds) {
                        $q->whereIn('barcode', $relCodes);
                        if (!empty($relNumIds)) {
                            $q->orWhereIn('id', array_map('intval', $relNumIds));
                        }
                    })
                    ->whereNotIn(DB::raw("LOWER(COALESCE(condition, 'good'))"), ['lost', 'damaged'])
                    ->whereNotIn(DB::raw("LOWER(COALESCE(status, 'available'))"), ['lost', 'damaged'])
                    ->where('status', '!=', 'released')
                    ->update(['status' => 'released', 'updated_at' => now()]);
            }

            // 4. Mark reserved physical units
            if (!empty($reservedBarcodes)) {
                $resNumIds = array_values(array_filter($reservedBarcodes, fn($v) => is_numeric($v) && (int)$v > 0));
                $resCodes = array_values(array_filter($reservedBarcodes, fn($v) => !empty($v)));

                DB::table('equipment_units')
                    ->where(function($q) use ($resCodes, $resNumIds) {
                        $q->whereIn('barcode', $resCodes);
                        if (!empty($resNumIds)) {
                            $q->orWhereIn('id', array_map('intval', $resNumIds));
                        }
                    })
                    ->whereNotIn(DB::raw("LOWER(COALESCE(condition, 'good'))"), ['lost', 'damaged'])
                    ->whereNotIn(DB::raw("LOWER(COALESCE(status, 'available'))"), ['lost', 'damaged'])
                    ->where('status', '!=', 'reserved')
                    ->update(['status' => 'reserved', 'updated_at' => now()]);
            }

            // 5. Revert units that are no longer released or reserved back to 'available'
            $occupiedBarcodes = array_merge($releasedBarcodes, $reservedBarcodes);
            $occNumIds = array_values(array_filter($occupiedBarcodes, fn($v) => is_numeric($v) && (int)$v > 0));
            $occCodes = array_values(array_filter($occupiedBarcodes, fn($v) => !empty($v)));

            DB::table('equipment_units')
                ->whereIn('status', ['reserved', 'released'])
                ->whereNotIn(DB::raw("LOWER(COALESCE(condition, 'good'))"), ['lost', 'damaged'])
                ->when(!empty($occupiedBarcodes), function($q) use ($occCodes, $occNumIds) {
                    $q->whereNotIn('barcode', $occCodes);
                    if (!empty($occNumIds)) {
                        $q->whereNotIn('id', array_map('intval', $occNumIds));
                    }
                })
                ->update(['status' => 'available', 'updated_at' => now()]);

        } catch (\Throwable $e) {}
    }
}
