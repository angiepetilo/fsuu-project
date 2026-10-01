<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds a machine-detectable marker distinguishing a SPEC-RULE-4 automatic
     * rejection (competing booking auto-rejected because another request for
     * the same venue/slot was approved first) from a manual staff rejection.
     * Used by HistoryLogService to label these as "Rejected (automatic)" with
     * the winning booking's reference code, instead of relying on fragile
     * text-parsing of the rejection_reason string.
     */
    public function up(): void
    {
        if (Schema::hasTable('venue_bookings') && !Schema::hasColumn('venue_bookings', 'is_auto_rejected')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                $table->boolean('is_auto_rejected')->default(false)->after('rejection_reason');
                $table->string('auto_reject_winning_reference')->nullable()->after('is_auto_rejected');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('venue_bookings') && Schema::hasColumn('venue_bookings', 'is_auto_rejected')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                $table->dropColumn(['is_auto_rejected', 'auto_reject_winning_reference']);
            });
        }
    }
};
