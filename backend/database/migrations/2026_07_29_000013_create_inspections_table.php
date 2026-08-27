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
            $table->string('inspectable_type')->nullable(); // 'equipment_borrow' or 'avr_venue_booking'
            $table->unsignedBigInteger('inspectable_id')->nullable();
            $table->foreignId('inspected_by')->constrained('users')->cascadeOnDelete();
            $table->string('inspection_type'); // pre_use / pre_event, post_use / post_event
            $table->text('equipment_types')->nullable();
            $table->text('equipment_unit')->nullable();
            $table->string('condition');       // good, damaged, lost
            $table->boolean('is_late')->default(false);
            $table->string('timeliness')->default('on_time'); // on_time, late
            $table->integer('minutes_late')->default(0);
            $table->string('violation_type')->nullable();
            $table->text('notes')->nullable();
            $table->longText('evidence_photo')->nullable();
            $table->json('assigned_units')->nullable();   // { "0-0": "EQ-001", "PROJECTOR-0": "EQ-001" }
            $table->json('unit_conditions')->nullable();  // { "EQ-001": "Damaged", "0-0": "Damaged" }
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();

            $table->index(['inspectable_type', 'inspectable_id'], 'insp_inspectable_idx');
            $table->index('inspection_type', 'insp_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
