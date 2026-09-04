<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            if (Schema::hasColumn('equipment_units', 'unit_code')) {
                $table->dropColumn('unit_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_units', 'unit_code')) {
                $table->string('unit_code')->nullable()->after('barcode');
            }
        });
    }
};
