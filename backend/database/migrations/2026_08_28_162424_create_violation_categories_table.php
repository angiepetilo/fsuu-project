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
        if (!Schema::hasTable('violation_categories')) {
            Schema::create('violation_categories', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Seed standard requested categories
            $now = now();
            DB::table('violation_categories')->insert([
                ['name' => 'Property Damaged', 'description' => 'Physical property, room, or furniture damage during usage.', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Overtime', 'description' => 'Usage extended beyond the approved reservation schedule.', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Waste Disposal', 'description' => 'Improper waste disposal, littering, or failure to clean the facility.', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Other Policy Violation', 'description' => 'General university or AVRC policy breach.', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violation_categories');
    }
};
