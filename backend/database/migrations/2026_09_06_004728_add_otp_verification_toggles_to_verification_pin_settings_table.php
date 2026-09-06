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
        Schema::table('verification_pin_settings', function (Blueprint $table) {
            $table->boolean('venue_verify_email')->default(true);
            $table->boolean('venue_verify_phone')->default(false);
            $table->boolean('equipment_verify_email')->default(true);
            $table->boolean('equipment_verify_phone')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('verification_pin_settings', function (Blueprint $table) {
            $table->dropColumn([
                'venue_verify_email',
                'venue_verify_phone',
                'equipment_verify_email',
                'equipment_verify_phone'
            ]);
        });
    }
};
