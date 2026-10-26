<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('equipment_borrows') && !Schema::hasColumn('equipment_borrows', 'restricted_equipment')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                $table->longText('restricted_equipment')->nullable()->after('assigned_units');
            });
        }

        if (Schema::hasTable('venue_bookings') && !Schema::hasColumn('venue_bookings', 'restricted_equipment')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                $table->longText('restricted_equipment')->nullable()->after('assigned_units');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('equipment_borrows') && Schema::hasColumn('equipment_borrows', 'restricted_equipment')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                $table->dropColumn('restricted_equipment');
            });
        }

        if (Schema::hasTable('venue_bookings') && Schema::hasColumn('venue_bookings', 'restricted_equipment')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                $table->dropColumn('restricted_equipment');
            });
        }
    }
};
