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
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('inspected_by')->constrained('users')->cascadeOnDelete();
            $table->string('inspection_type'); // pre_use, post_use, post_event
            $table->string('condition'); // good, damaged, missing, lost
            $table->boolean('is_late')->default(false);
            $table->string('timeliness')->default('on_time');
            $table->integer('minutes_late')->default(0);
            $table->string('violation_type')->nullable();
            $table->text('notes')->nullable();
            $table->longText('evidence_photo')->nullable();
            $table->longText('assigned_units')->nullable();
            $table->longText('unit_conditions')->nullable();
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
