<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_pin_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('office_id')->nullable()->constrained('offices')->cascadeOnDelete();
            $table->string('master_pin', 10)->default('123456');
            $table->boolean('is_enabled')->default(true);
            $table->boolean('require_outside_hours')->default(true);
            $table->boolean('require_multi_day_venue')->default(true);
            $table->boolean('require_multi_day_equipment')->default(true);
            $table->boolean('require_external')->default(true);
            $table->string('pin_mode', 20)->default('optional'); // 'optional' or 'required'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_pin_settings');
    }
};
