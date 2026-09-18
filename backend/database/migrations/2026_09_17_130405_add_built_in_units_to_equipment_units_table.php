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
        if (Schema::hasTable('equipment_units') && !Schema::hasColumn('equipment_units', 'built_in_units')) {
            Schema::table('equipment_units', function (Blueprint $table) {
                $table->json('built_in_units')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('equipment_units') && Schema::hasColumn('equipment_units', 'built_in_units')) {
            Schema::table('equipment_units', function (Blueprint $table) {
                $table->dropColumn('built_in_units');
            });
        }
    }
};
