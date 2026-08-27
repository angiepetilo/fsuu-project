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
            $table->foreignId('academic_term_id')->nullable()->constrained('academic_terms')->nullOnDelete();
            $table->foreignId('tracking_number_id')->constrained('tracking_numbers')->cascadeOnDelete();
            $table->string('submission_channel')->default('online_self');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('filer_name')->nullable();
            $table->string('email_address');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('program_office')->nullable();
            $table->string('contact_number');
            $table->string('classification');
            $table->string('place_of_use')->default('inside');
            $table->text('purpose');
            $table->date('date_of_usage');
            $table->date('extend_of_date_returned')->nullable();
            $table->time('time_start');
            $table->time('time_end');
            $table->unsignedBigInteger('equipment_units_id')->nullable();
            $table->string('status')->default('pending');
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
