<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venue_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_term_id')->nullable()->constrained('academic_terms')->nullOnDelete();
            $table->foreignId('tracking_number_id')->constrained('tracking_numbers')->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->string('submission_channel')->default('online_self');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('filer_name')->nullable();
            $table->string('email_address');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('program_office')->nullable();
            $table->string('contact_number');
            $table->string('classification');
            $table->string('place_of_use')->default('inside');
            $table->text('purpose');
            $table->text('equipment_types')->nullable();
            $table->text('equipment_units')->nullable();
            $table->text('equipment_notes')->nullable();
            $table->integer('no_of_person');
            $table->date('date_of_usage');
            $table->date('reservation_end_date')->nullable();
            $table->date('extend_reservation_end_date')->nullable();
            $table->time('time_start');
            $table->time('time_end');
            $table->boolean('agreed_to_policy')->default(false);
            $table->string('status')->default('pending');
            $table->longText('assigned_units')->nullable();
            $table->string('endorsement_url')->nullable();
            $table->string('endorsement_letter')->nullable();
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();

            $table->index(['venue_id', 'date_of_usage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_bookings');
    }
};
