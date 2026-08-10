<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venue_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('venue_bookings', 'equipment_notes')) {
                $table->text('equipment_notes')->nullable();
            }
            if (!Schema::hasColumn('venue_bookings', 'reservation_end_date')) {
                $table->date('reservation_end_date')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('venue_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('venue_bookings', 'equipment_notes')) {
                $table->dropColumn('equipment_notes');
            }
            if (Schema::hasColumn('venue_bookings', 'reservation_end_date')) {
                $table->dropColumn('reservation_end_date');
            }
        });
    }
};
