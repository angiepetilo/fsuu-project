<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_borrow_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_borrow_id')->constrained('equipment_borrows')->cascadeOnDelete();
            $table->foreignId('equipment_type_id')->nullable()->constrained('equipment_types')->cascadeOnDelete();
            $table->foreignId('equipment_types_id')->nullable()->constrained('equipment_types')->cascadeOnDelete();
            $table->foreignId('equipment_unit_id')->nullable()->constrained('equipment_units')->nullOnDelete();
            $table->foreignId('equipment_units_id')->nullable()->constrained('equipment_units')->nullOnDelete();
            $table->integer('quantity_requested')->default(1);
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_borrow_items');
    }
};
