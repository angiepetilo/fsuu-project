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
        Schema::create('entry_verifications', function (Blueprint $table) {
    $table->id();
            $table->foreignId('avr_venue_booking_id')->constrained('avr_venue_bookings')->cascadeOnDelete();
            $table->foreignId('verified_by')->constrained('users');
            $table->string('contact_method_verified'); // sms or email
            $table->timestamp('verified_at');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entry_verifications');
    }
};
