<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove seeded default brands (from the initial migration) that have no
     * physical equipment units associated with them.  Only brands with 0 linked
     * units and whose description follows the "Equipment manufacturer <NAME>"
     * seed pattern are removed, so any brand the admin genuinely created is
     * preserved even if it currently has 0 units.
     */
    public function up(): void
    {
        if (!Schema::hasTable('brands')) {
            return;
        }

        try {
            // The default seeded brand names from the original migration
            $defaultSeeds = ['EPSON', 'SONY', 'CANON', 'ACER', 'LOGITECH', 'DELL', 'HP', 'SAMSUNG', 'PANASONIC'];

            if (Schema::hasTable('equipment_units')) {
                // Delete only seed brands that still have 0 physical units linked to them
                DB::table('brands')
                    ->whereIn('brands.name', $defaultSeeds)
                    ->where(function ($q) {
                        // Match the auto-generated description pattern
                        $q->whereRaw("LOWER(brands.description) LIKE 'equipment manufacturer%'")
                          ->orWhereNull('brands.description');
                    })
                    ->whereNotExists(function ($sub) {
                        // Keep if at least one unit is linked to this brand
                        $sub->select(DB::raw(1))
                            ->from('equipment_units')
                            ->whereRaw('LOWER(TRIM(equipment_units.brand)) = LOWER(TRIM(brands.name))')
                            ->whereNull('equipment_units.archived_at');
                    })
                    ->delete();
            } else {
                // No units table yet – safe to delete all seeded brands
                DB::table('brands')
                    ->whereIn('name', $defaultSeeds)
                    ->whereRaw("LOWER(description) LIKE 'equipment manufacturer%'")
                    ->delete();
            }
        } catch (\Throwable $e) {
            // Non-critical – do not break migrations
        }
    }

    /**
     * Reverse is a no-op: we do not re-seed the fake brands.
     */
    public function down(): void
    {
        // Intentionally left blank – we don't want to re-introduce fake data.
    }
};
