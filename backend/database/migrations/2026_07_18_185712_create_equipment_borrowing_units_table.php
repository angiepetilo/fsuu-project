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
        Schema::create('equipment_borrowing_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_borrowing_item_id')->constrained('equipment_borrowing_items')->cascadeOnDelete();
            $table->foreignId('equipment_unit_id')->constrained('equipment_units');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_borrowing_units');
    }
};
