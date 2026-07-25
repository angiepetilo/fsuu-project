<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add updated_by to equipment_units for inventory tracking
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->unsignedBigInteger('updated_by')->nullable()->after('unit_status_notes');
        });

        // Add purchased_date and lifespan_years to equipment_types for age tracking
        Schema::table('equipment_types', function (Blueprint $table) {
            $table->date('purchased_date')->nullable()->after('is_active');
            $table->unsignedInteger('lifespan_years')->nullable()->after('purchased_date');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->dropColumn('updated_by');
        });

        Schema::table('equipment_types', function (Blueprint $table) {
            $table->dropColumn(['purchased_date', 'lifespan_years']);
        });
    }
};
