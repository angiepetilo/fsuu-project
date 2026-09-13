<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_pin_settings', function (Blueprint $table) {
            $table->id();
            $table->string('master_pin', 255)->nullable();               // Bcrypt hash for secure storage
            $table->string('hashed_master_pin', 255)->nullable();        // Bcrypt hash for secure verify
            $table->boolean('is_enabled')->default(true);
            $table->boolean('require_outside_hours')->default(true);
            $table->boolean('require_multi_day_venue')->default(true);
            $table->boolean('require_multi_day_equipment')->default(true);
            $table->boolean('require_external')->default(true);
            $table->json('applicability_matrix')->nullable();
            $table->string('pin_mode', 20)->default('optional');         // 'optional' or 'required'
            $table->boolean('venue_verify_email')->default(true);
            $table->boolean('venue_verify_phone')->default(false);
            $table->boolean('equipment_verify_email')->default(true);
            $table->boolean('equipment_verify_phone')->default(false);
            $table->timestamps();
        });

        $defaultHash = Hash::make('123456');

        // Seed the default row with hashed PIN
        \Illuminate\Support\Facades\DB::table('verification_pin_settings')->insert([
            'master_pin'                  => $defaultHash,
            'hashed_master_pin'           => $defaultHash,
            'is_enabled'                  => true,
            'require_outside_hours'       => true,
            'require_multi_day_venue'     => true,
            'require_multi_day_equipment' => true,
            'require_external'            => true,
            'pin_mode'                    => 'optional',
            'venue_verify_email'          => true,
            'venue_verify_phone'          => false,
            'equipment_verify_email'      => true,
            'equipment_verify_phone'      => false,
            'created_at'                  => now(),
            'updated_at'                  => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_pin_settings');
    }
};
