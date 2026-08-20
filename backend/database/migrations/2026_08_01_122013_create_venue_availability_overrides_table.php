<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venue_availability_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->date('override_date');
            // status: available | maintenance | closed | partial
            $table->string('status')->default('maintenance');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['venue_id', 'override_date']); // one override per venue per day
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_availability_overrides');
    }
};
