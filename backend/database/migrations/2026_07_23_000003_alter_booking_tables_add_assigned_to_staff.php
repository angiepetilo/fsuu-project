<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds assigned_to_staff_id (nullable FK → users.id) to all three core booking tables.
     *
     * Rules:
     *   - Nullable: a booking can exist without any Staff assigned (e.g. immediately after
     *     Public submission, before Admin assigns it for handling).
     *   - nullOnDelete(): if the Staff user account is deleted, the booking record survives
     *     and becomes unassigned (assigned_to_staff_id → NULL). The booking is NOT deleted
     *     with the user. This is deliberate — booking history must be preserved.
     *
     * Column position:
     *   - Placed after 'submitted_by' on each table, which is the last FK before timestamps
     *     in all three existing migrations.
     *
     * Tables affected:
     *   avr_venue_bookings       — AVR Staff can be assigned to manage a venue booking
     *   equipment_borrowings     — AVR Staff can be assigned to handle an equipment borrowing
     *   sco_studio_reservations  — SCO Staff can be assigned to manage a studio reservation
     */
    public function up(): void
    {
        Schema::table('avr_venue_bookings', function (Blueprint $table) {
            $table->foreignId('assigned_to_staff_id')
                ->nullable()
                ->after('submitted_by')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('equipment_borrowings', function (Blueprint $table) {
            $table->foreignId('assigned_to_staff_id')
                ->nullable()
                ->after('submitted_by')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('sco_studio_reservations', function (Blueprint $table) {
            $table->foreignId('assigned_to_staff_id')
                ->nullable()
                ->after('submitted_by')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('avr_venue_bookings', function (Blueprint $table) {
            $table->dropForeign(['assigned_to_staff_id']);
            $table->dropColumn('assigned_to_staff_id');
        });

        Schema::table('equipment_borrowings', function (Blueprint $table) {
            $table->dropForeign(['assigned_to_staff_id']);
            $table->dropColumn('assigned_to_staff_id');
        });

        Schema::table('sco_studio_reservations', function (Blueprint $table) {
            $table->dropForeign(['assigned_to_staff_id']);
            $table->dropColumn('assigned_to_staff_id');
        });
    }
};
