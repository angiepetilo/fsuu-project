<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venue_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('venue_bookings', 'claim_timestamp')) {
                $table->dateTime('claim_timestamp')->nullable()->after('status')->index();
            }
            if (!Schema::hasColumn('venue_bookings', 'is_complete')) {
                $table->boolean('is_complete')->default(true)->after('claim_timestamp');
            }
        });

        // Backfill existing records: set claim_timestamp = created_at where null
        DB::table('venue_bookings')
            ->whereNull('claim_timestamp')
            ->update([
                'claim_timestamp' => DB::raw('created_at'),
                'is_complete'     => true,
            ]);
    }

    public function down(): void
    {
        Schema::table('venue_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('venue_bookings', 'claim_timestamp')) {
                $table->dropColumn('claim_timestamp');
            }
            if (Schema::hasColumn('venue_bookings', 'is_complete')) {
                $table->dropColumn('is_complete');
            }
        });
    }
};
