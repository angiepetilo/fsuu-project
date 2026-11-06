<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('venues')) {
            Schema::table('venues', function (Blueprint $table) {
                if (!Schema::hasColumn('venues', 'visible_in_venue_booking')) {
                    $table->boolean('visible_in_venue_booking')->default(true)->after('status');
                }
            });

            // Backfill existing rows so visible_in_venue_booking is true
            DB::table('venues')
                ->whereNull('visible_in_venue_booking')
                ->update(['visible_in_venue_booking' => true]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('venues')) {
            Schema::table('venues', function (Blueprint $table) {
                if (Schema::hasColumn('venues', 'visible_in_venue_booking')) {
                    $table->dropColumn('visible_in_venue_booking');
                }
            });
        }
    }
};

