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
            $table->string('master_pin', 10)->default('123456');          // Plaintext (shown in admin UI)
            $table->string('hashed_master_pin', 255)->nullable();         // Bcrypt hash for secure verify
            $table->boolean('is_enabled')->default(true);
            $table->boolean('require_outside_hours')->default(true);
            $table->boolean('require_multi_day_venue')->default(true);
            $table->boolean('require_multi_day_equipment')->default(true);
            $table->boolean('require_external')->default(true);
            $table->string('pin_mode', 20)->default('optional');          // 'optional' or 'required'
            $table->timestamps();
        });

        // Seed the default row with hashed PIN
        \Illuminate\Support\Facades\DB::table('verification_pin_settings')->insert([
            'master_pin'        => '123456',
            'hashed_master_pin' => Hash::make('123456'),
            'is_enabled'        => true,
            'require_outside_hours'       => true,
            'require_multi_day_venue'     => true,
            'require_multi_day_equipment' => true,
            'require_external'            => true,
            'pin_mode'          => 'optional',
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_pin_settings');
    }
};
