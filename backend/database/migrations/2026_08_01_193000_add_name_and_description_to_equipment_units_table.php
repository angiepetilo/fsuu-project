<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_units', 'name')) {
                $table->string('name')->nullable()->after('equipment_type_id');
            }
            if (!Schema::hasColumn('equipment_units', 'description')) {
                $table->text('description')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            if (Schema::hasColumn('equipment_units', 'name')) {
                $table->dropColumn('name');
            }
            if (Schema::hasColumn('equipment_units', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
