<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operating_hours', function (Blueprint $table) {
            $table->id();
            // Venue Reservation Hours
            $table->time('venue_open')->default('07:00:00');
            $table->time('venue_close')->default('17:00:00');
            // Equipment Kiosk Borrowing Hours
            $table->time('equipment_open')->default('07:00:00');
            $table->time('equipment_close')->default('17:00:00');
            // Grace Periods (in minutes)
            $table->unsignedSmallInteger('arrival_grace_mins')->default(15);
            $table->unsignedSmallInteger('return_grace_mins')->default(30);
            $table->unsignedSmallInteger('auto_cancel_mins')->default(30);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operating_hours');
    }
};
