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
        Schema::create('equipment_borrowing_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_borrowing_id')->constrained('equipment_borrowings')->cascadeOnDelete();
            $table->foreignId('equipment_type_id')->constrained('equipment_types');
            $table->integer('quantity_requested');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_borrowing_items');
    }
};
