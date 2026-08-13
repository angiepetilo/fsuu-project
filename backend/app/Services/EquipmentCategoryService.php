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
        // 1. Calculate units released in ACTIVE ON-GOING equipment borrowings ONLY
        $borrowedCount = 0;
        try {
            if (Schema::hasTable('equipment_borrow_items') && Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
                $borrowedCount = DB::table('equipment_borrow_items')
                    ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->where('equipment_borrow_items.equipment_type_id', $e->id)
                    ->whereNull('equipment_borrows.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing', 'borrowed'])
                    ->sum('equipment_borrow_items.quantity_requested');
            }
        } catch (\Throwable $th) {
            $borrowedCount = 0;
        }

        // 2. Calculate units released in ACTIVE ON-GOING venue bookings
        $venueCount = 0;
        try {
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $activeVbs = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing'])
                    ->select('venue_bookings.id', 'venue_bookings.equipment_notes')
                    ->get();

                $venueCount = $activeVbs->sum(function ($vb) use ($e) {
                    if (Schema::hasTable('venue_booking_equipment')) {
                        $structItems = DB::table('venue_booking_equipment')
                            ->where('venue_booking_id', $vb->id)
                            ->get();

                        if ($structItems->count() > 0) {
                            return (int) $structItems->where('equipment_type_id', $e->id)->sum('quantity_requested');
                        }
                    }

                    // Fallback to regex parsing for legacy bookings without structured rows
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
        }

        $releasedTotal = (int) ($borrowedCount + $venueCount);
        $totalQty = (int) ($e->calculated_total ?? $e->total_quantity ?? 0);

        // 3. Physical unit status counts
        $damagedCount = 0;
        $lostCount = 0;
        $reservedCount = 0;
        try {
            if (Schema::hasTable('equipment_units')) {
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
                          ->orWhereIn(DB::raw('LOWER(`condition`)'), ['damaged', 'maintenance', 'worn']);
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
            }
        } catch (\Throwable $th) {}

        $availCount = max(0, $totalQty - $releasedTotal - $reservedCount - $damagedCount - $lostCount);

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
            'available_count' => $availCount,
            'released_count'  => $releasedTotal,
            'reserved_count'  => $reservedCount,
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
