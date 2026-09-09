<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('brands')) {
            Schema::create('brands', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->text('description')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamps();
            });
        }

        // Seed existing brands from equipment_units if any exist
        try {
            $existingBrands = DB::table('equipment_units')
                ->whereNotNull('brand')
                ->where('brand', '!=', '')
                ->distinct()
                ->pluck('brand');

            $defaultBrands = ['EPSON', 'SONY', 'CANON', 'ACER', 'LOGITECH', 'DELL', 'HP', 'SAMSUNG', 'PANASONIC'];
            $allInitial = collect($existingBrands)->merge($defaultBrands)->unique()->filter();

            foreach ($allInitial as $brandName) {
                $clean = trim((string)$brandName);
                if (!empty($clean)) {
                    DB::table('brands')->insertOrIgnore([
                        'name' => strtoupper($clean),
                        'description' => 'Equipment manufacturer ' . strtoupper($clean),
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            // Non-critical seed fallback
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};
