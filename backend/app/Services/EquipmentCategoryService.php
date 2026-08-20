<?php

namespace App\Services;

use App\Models\EquipmentType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EquipmentCategoryService
{
    /**
     * Compute comprehensive stock statistics (borrowed, venue allocated, reserved, damaged, lost, available)
     */
    public function formatCategoryResponse(EquipmentType $e): array
    {
        $hasUnitsTable = Schema::hasTable('equipment_units');
        $registeredUnitsCount = 0;
        $physicalReleased = 0;
        $damagedCount = 0;
        $lostCount = 0;
        $reservedCount = 0;
        $availableUnitsCount = 0;

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
                        $q->whereIn(DB::raw('LOWER(status)'), ['damaged', 'maintenance', 'unavailable'])
                          ->orWhereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'maintenance', 'worn', 'under repair']);
                    })
                    ->count();

                $lostCount = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw('LOWER(status)'), ['decommissioned', 'lost'])
                          ->orWhereIn(DB::raw('LOWER(`condition`)'), ['lost']);
                    })
                    ->count();

                $availableUnitsCount = DB::table('equipment_units')
                    ->where('equipment_type_id', $e->id)
                    ->whereNull('archived_at')
                    ->where(DB::raw('LOWER(status)'), 'available')
                    ->whereNotIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'under repair', 'worn'])
                    ->count();
            } catch (\Throwable $th) {}
        }

        // 1. Calculate units released & reserved in equipment borrowings
        $borrowedCount = 0;
        $approvedBorrowCount = 0;
        try {
            if (Schema::hasTable('equipment_borrow_items') && Schema::hasTable('equipment_borrows')) {
                $borrowTypeIds = [$e->id, $e->eq_name, $e->name, $e->category];

                $borrowedCount = DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('equipment_borrow_items.equipment_type_id', $borrowTypeIds)
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw('LOWER(COALESCE(tracking_numbers.status, equipment_borrows.status))'), ['on-going', 'ongoing', 'borrowed', 'released']);
                    })
                    ->sum('equipment_borrow_items.quantity_requested');

                $approvedBorrowCount = DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('equipment_borrow_items.equipment_type_id', $borrowTypeIds)
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw('LOWER(COALESCE(tracking_numbers.status, equipment_borrows.status))'), ['pending', 'approved', 'scheduled', 'reserved']);
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
                        $q->whereIn(DB::raw('LOWER(COALESCE(tracking_numbers.status, venue_bookings.status))'), ['on-going', 'ongoing']);
                    })
                    ->select('venue_bookings.id', 'venue_bookings.equipment_notes')
                    ->get();

                $venueCount = $activeVbs->sum(function ($vb) use ($e) {
                    if (Schema::hasTable('venue_booking_equipment')) {
                        $structItems = DB::table('venue_booking_equipment')
                            ->where('venue_booking_id', $vb->id)
                            ->get();

                        if ($structItems->count() > 0) {
                            return (int) $structItems->whereIn('equipment_type_id', [$e->id, $e->eq_name, $e->name])->sum('quantity_requested');
                        }
                    }

                    $eqText = strtoupper($vb->equipment_notes ?? '');
                    $typeName = strtoupper($e->eq_name ?? $e->name ?? '');
                    $typeId = (string) $e->id;

                    if (preg_match('/(?:^|,\s*)' . preg_quote($typeId, '/') . '\s*\(Qty:\s*(\d+)\)/i', $eqText, $m)) {
                        return (int)$m[1];
                    }
                    if ($typeName && str_contains($eqText, $typeName)) {
                        preg_match('/' . preg_quote($typeName, '/') . '[^\d]*(\d+)/i', $eqText, $m);
                        return isset($m[1]) ? (int)$m[1] : 1;
                    }
                    return 0;
                });

                $approvedVbs = DB::table('venue_bookings')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->where(function($q) {
                        $q->whereIn(DB::raw('LOWER(COALESCE(tracking_numbers.status, venue_bookings.status))'), ['pending', 'approved', 'scheduled', 'reserved']);
                    })
                    ->select('venue_bookings.id', 'venue_bookings.equipment_notes')
                    ->get();

                $approvedVenueCount = $approvedVbs->sum(function ($vb) use ($e) {
                    if (Schema::hasTable('venue_booking_equipment')) {
                        $structItems = DB::table('venue_booking_equipment')
                            ->where('venue_booking_id', $vb->id)
                            ->get();

                        if ($structItems->count() > 0) {
                            return (int) $structItems->whereIn('equipment_type_id', [$e->id, $e->eq_name, $e->name])->sum('quantity_requested');
                        }
                    }

                    $eqText = strtoupper($vb->equipment_notes ?? '');
                    $typeName = strtoupper($e->eq_name ?? $e->name ?? '');
                    $typeId = (string) $e->id;

                    if (preg_match('/(?:^|,\s*)' . preg_quote($typeId, '/') . '\s*\(Qty:\s*(\d+)\)/i', $eqText, $m)) {
                        return (int)$m[1];
                    }
                    if ($typeName && str_contains($eqText, $typeName)) {
                        preg_match('/' . preg_quote($typeName, '/') . '[^\d]*(\d+)/i', $eqText, $m);
                        return isset($m[1]) ? (int)$m[1] : 1;
                    }
                    return 0;
                });
            }
        } catch (\Throwable $th) {
            $venueCount = 0;
            $approvedVenueCount = 0;
        }

        $bookingReleased = (int) ($borrowedCount + $venueCount);
        $bookingReserved = (int) ($approvedBorrowCount + $approvedVenueCount);

        // Actual release reflects the maximum of physically released units and ongoing bookings
        $releasedTotal = max($physicalReleased, $bookingReleased);
        // Reserved reflects units in pending/approved bookings or tagged as reserved
        $reservedTotal = max($reservedCount, $bookingReserved);

        $totalQty = $registeredUnitsCount > 0
            ? $registeredUnitsCount
            : (int) ($e->total_quantity ?? 0);

        // Physical units currently sitting on the shelf (Total - Checked Out/Released - Damaged - Lost)
        $presentCount = max(0, $totalQty - $releasedTotal - $damagedCount - $lostCount);
        $reservedCapped = min($presentCount, $reservedTotal);

        $officeName = $e->office?->name ?? 'AVR Center';
        $officeLocation = $e->office?->location ?? 'FSUU Campus';
        $campusLabel = $e->office ? "{$officeName} — {$officeLocation}" : 'AVR Center';

        return [
            'id'              => $e->id,
            'office_id'       => $e->office_id,
            'office_name'     => $officeName,
            'office_location' => $officeLocation,
            'campus_label'    => $campusLabel,
            'eq_name'         => $e->eq_name ?? $e->name,
            'eq_type'         => $e->eq_type ?? $e->category,
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
            'office'          => $e->office,
            'created_at'      => $e->created_at,
        ];
    }

    /**
     * Same-office duplicate check (Case-insensitive exact match).
     * Blocks creation to prevent fragmenting an office's own stock.
     */
    public function hasSameOfficeDuplicate(string $name, int $officeId, ?int $excludeId = null): bool
    {
        $norm = strtolower(trim($name));
        return EquipmentType::where(DB::raw('LOWER(TRIM(eq_name))'), $norm)
            ->where('office_id', $officeId)
            ->when($excludeId, function($q) use ($excludeId) {
                $q->where('id', '!=', $excludeId);
            })
            ->exists();
    }

    /**
     * Cross-office near-duplicate check (Advisory notice only).
     * Does NOT block category creation.
     */
    public function checkNearDuplicateWarning(string $name, int $officeId, ?int $excludeId = null): ?string
    {
        $norm = strtolower(trim($name));
        $matches = EquipmentType::with('office')
            ->where(function($q) use ($norm, $name) {
                $q->where(DB::raw('LOWER(TRIM(eq_name))'), $norm)
                  ->orWhere('eq_name', 'LIKE', "%{$name}%");
            })
            ->where('office_id', '!=', $officeId)
            ->when($excludeId, function($q) use ($excludeId) {
                $q->where('id', '!=', $excludeId);
            })
            ->get();

        if ($matches->count() > 0) {
            $officesList = $matches->map(function($m) {
                $loc = $m->office?->location ?? "Office #{$m->office_id}";
                return "'{$m->eq_name}' at {$loc}";
            })->unique()->implode(', ');

            return "Advisory Notice: Similar category name already exists at other branch ({$officesList}). Consider aligning naming if this represents shared inventory equipment.";
        }

        return null;
    }
}
