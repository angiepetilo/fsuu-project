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
        Schema::create('avr_venue_bookings', function (Blueprint $table) {
        $table->id();
        $table->string('reference_code')->unique();
        $table->foreignId('venue_id')->constrained('venues');
        $table->string('requestor_name');
        $table->string('requestor_email');
        $table->string('requestor_contact_number');
        $table->string('requestor_program_office');
        $table->string('requestor_identity_type');
        $table->string('booking_classification');
        $table->text('purpose');
        $table->integer('number_of_persons');
        $table->string('title_of_reservation');
        $table->string('event_type');
        $table->text('equipment_notes')->nullable();
        $table->string('contact_preference'); // sms or email
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
        Schema::dropIfExists('avr_venue_bookings');
    }
};
