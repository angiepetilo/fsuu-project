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
            $table->foreignId('tracking_number_id')->constrained('tracking_numbers')->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('submission_channel'); // online_self, staff_entered
            $table->string('filer_name');
            $table->string('email_address');
            $table->string('program_office');
            $table->string('contact_number');
            $table->string('classification'); // student, faculty, external
            $table->string('place_of_use')->default('inside'); // inside, outside
            $table->text('purpose');
            $table->text('equipment_notes')->nullable();
            $table->integer('no_of_person');
            $table->date('date_of_usage');
            $table->date('reservation_end_date')->nullable();
            $table->time('time_start');
            $table->time('time_end');
            $table->string('school_id')->nullable();
            $table->boolean('agreed_to_policy')->default(false);
            $table->longText('assigned_units')->nullable();
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
