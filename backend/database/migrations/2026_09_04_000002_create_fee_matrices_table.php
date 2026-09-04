<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_matrices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('venue_id')->nullable()->index();
            $table->string('title')->default('Facility Rental Fee Schedule and Reservation Policy');
            $table->boolean('show_signatures')->default(true);
            $table->boolean('show_rate_items')->default(true);
            $table->boolean('notes_enabled')->default(true);
            $table->text('notes')->nullable();
            $table->json('signatories')->nullable();
            $table->json('rate_items')->nullable();
            $table->timestamps();

            $table->foreign('venue_id')->references('id')->on('venues')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_matrices');
    }
};
