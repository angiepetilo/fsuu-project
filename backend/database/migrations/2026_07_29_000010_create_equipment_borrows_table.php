<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_borrows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tracking_number_id')->constrained('tracking_numbers')->cascadeOnDelete();
            $table->string('submission_channel')->default('online_self'); // online_self, staff_entered
            $table->string('filer_name');
            $table->string('email_address');
            $table->string('program_office');
            $table->string('contact_number');
            $table->string('classification'); // student, faculty
            $table->string('place_of_use'); // inside, outside
            $table->text('purpose');
            $table->date('date_of_usage');
            $table->time('time_start');
            $table->time('time_end');
            $table->longText('assigned_units')->nullable();
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();

            $table->index(['date_of_usage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_borrows');
    }
};
