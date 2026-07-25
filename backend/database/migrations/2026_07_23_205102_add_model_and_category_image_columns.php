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
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->string('brand_model')->nullable()->after('barcode');
        });

        Schema::table('equipment_types', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->dropColumn('brand_model');
        });

        Schema::table('equipment_types', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};
