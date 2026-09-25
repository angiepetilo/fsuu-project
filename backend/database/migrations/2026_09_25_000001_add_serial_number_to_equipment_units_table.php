<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_units', 'serial_number')) {
                $table->string('serial_number')->nullable()->after('model');
            }
        });
    }

    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            if (Schema::hasColumn('equipment_units', 'serial_number')) {
                $table->dropColumn('serial_number');
            }
        });
    }
};
