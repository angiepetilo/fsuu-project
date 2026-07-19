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
        Schema::create('equipment_borrowings', function (Blueprint $table) {
        $table->id();
        $table->string('reference_code')->unique();
        $table->foreignId('avr_venue_booking_id')->nullable()->constrained('avr_venue_bookings')->nullOnDelete();
        $table->string('requestor_name');
        $table->string('requestor_email');
        $table->string('requestor_contact_number');
        $table->string('requestor_program_office');
        $table->string('requestor_identity_type');
        $table->text('purpose');
        $table->string('place_of_use');
        $table->boolean('used_inside_campus')->default(true);
        $table->string('contact_preference');
        $table->dateTime('start_datetime');
        $table->dateTime('end_datetime');
        $table->string('status')->default('pending');
        $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_borrowings');
    }
};
