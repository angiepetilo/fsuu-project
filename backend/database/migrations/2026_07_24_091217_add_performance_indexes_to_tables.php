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
        Schema::table('venues', function (Blueprint $table) {
            $table->index('office_id');
        });

        Schema::table('equipment_types', function (Blueprint $table) {
            $table->index('office_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('office_id');
        });

        Schema::table('avr_venue_bookings', function (Blueprint $table) {
            $table->index(['venue_id', 'start_datetime', 'end_datetime'], 'avr_bookings_venue_time_idx');
            $table->index('status');
            $table->index('reference_code');
        });

        Schema::table('equipment_borrowings', function (Blueprint $table) {
            $table->index('status');
            $table->index('reference_code');
        });

        Schema::table('sco_studio_reservations', function (Blueprint $table) {
            $table->index(['venue_id', 'start_datetime', 'end_datetime'], 'sco_res_venue_time_idx');
            $table->index('status');
            $table->index('reference_code');
        });

        Schema::table('approvals', function (Blueprint $table) {
            $table->index(['reference_type', 'reference_id']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->index(['reference_type', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->dropIndex(['office_id']);
        });

        Schema::table('equipment_types', function (Blueprint $table) {
            $table->dropIndex(['office_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['office_id']);
        });

        Schema::table('avr_venue_bookings', function (Blueprint $table) {
            $table->dropIndex('avr_bookings_venue_time_idx');
            $table->dropIndex(['status']);
            $table->dropIndex(['reference_code']);
        });

        Schema::table('equipment_borrowings', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['reference_code']);
        });

        Schema::table('sco_studio_reservations', function (Blueprint $table) {
            $table->dropIndex('sco_res_venue_time_idx');
            $table->dropIndex(['status']);
            $table->dropIndex(['reference_code']);
        });

        Schema::table('approvals', function (Blueprint $table) {
            $table->dropIndex(['reference_type', 'reference_id']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex(['reference_type', 'reference_id']);
        });
    }
};
