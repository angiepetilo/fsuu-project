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
            $table->date('purchased_date')->nullable()->after('barcode');
            $table->integer('lifespan_years')->nullable()->after('purchased_date');
            $table->string('image_path')->nullable()->after('lifespan_years');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->dropColumn(['purchased_date', 'lifespan_years', 'image_path']);
        });
    }
};
