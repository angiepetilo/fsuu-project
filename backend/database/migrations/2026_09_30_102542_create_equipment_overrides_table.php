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
        Schema::create('equipment_overrides', function (Blueprint $table) {
            $table->id();
            $table->date('override_date')->unique();
            $table->string('status', 50)->default('closed'); // 'closed', 'maintenance', 'available'
            $table->string('start_time', 20)->default('07:30');
            $table->string('end_time', 20)->default('17:00');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_overrides');
    }
};
