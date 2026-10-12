<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add rejection_reason column to venue_bookings table.
     * This column is referenced in HistoryLogService and VenueBookingService but
     * was missing from the database, causing a SQL error that prevented all
     * venue booking history records from appearing in History Log and Reports.
     */
    public function up(): void
    {
        Schema::table('venue_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('venue_bookings', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('is_auto_rejected');
            }
        });
    }

    public function down(): void
    {
        Schema::table('venue_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('venue_bookings', 'rejection_reason')) {
                $table->dropColumn('rejection_reason');
            }
        });
    }
};
