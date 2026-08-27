<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('academic_terms')) {
            Schema::create('academic_terms', function (Blueprint $table) {
                $table->id();
                $table->string('name');                      // e.g. "1st Semester AY 2026-2027"
                $table->string('academic_year');             // e.g. "2026-2027"
                $table->string('semester');                  // e.g. "1st Semester", "2nd Semester", "Summer Term"
                $table->date('start_date');
                $table->date('end_date');
                $table->boolean('is_active')->default(false);
                $table->unsignedInteger('total_venue_bookings')->default(0);
                $table->unsignedInteger('total_equipment_borrowings')->default(0);
                $table->unsignedInteger('total_breaches')->default(0);
                $table->timestamp('closed_at')->nullable();
                $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('venue_bookings') && !Schema::hasColumn('venue_bookings', 'academic_term_id')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                $table->foreignId('academic_term_id')->nullable()->after('id')->constrained('academic_terms')->nullOnDelete();
            });
        }

        if (Schema::hasTable('equipment_borrows') && !Schema::hasColumn('equipment_borrows', 'academic_term_id')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                $table->foreignId('academic_term_id')->nullable()->after('id')->constrained('academic_terms')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('venue_bookings') && Schema::hasColumn('venue_bookings', 'academic_term_id')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                $table->dropForeign(['academic_term_id']);
                $table->dropColumn('academic_term_id');
            });
        }

        if (Schema::hasTable('equipment_borrows') && Schema::hasColumn('equipment_borrows', 'academic_term_id')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                $table->dropForeign(['academic_term_id']);
                $table->dropColumn('academic_term_id');
            });
        }

        Schema::dropIfExists('academic_terms');
    }
};
