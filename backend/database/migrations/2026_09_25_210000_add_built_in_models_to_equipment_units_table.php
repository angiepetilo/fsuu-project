<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            // Stores model names per linked built-in: e.g. {"HDMI": "3m Gold", "Extension Wire": "Belkin 5m"}
            $table->json('built_in_models')->nullable()->after('built_in_units');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->dropColumn('built_in_models');
        });
    }
};
