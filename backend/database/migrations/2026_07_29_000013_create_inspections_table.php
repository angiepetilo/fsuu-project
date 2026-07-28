<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->string('inspectable_type'); // "venue_booking" or "equipment_unit"
            $table->unsignedBigInteger('inspectable_id');
            $table->foreignId('inspected_by')->constrained('users')->cascadeOnDelete();
            $table->string('inspection_type'); // pre_use, post_use
            $table->string('condition'); // good, damaged, missing
            $table->text('notes')->nullable();
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();

            $table->index(['inspectable_type', 'inspectable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
