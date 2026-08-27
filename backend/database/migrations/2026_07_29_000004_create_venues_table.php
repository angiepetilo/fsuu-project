<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->longText('avatar')->nullable();
            $table->string('location')->nullable();
            $table->integer('capacity')->default(100);
            $table->text('allowed_equipment_types_id')->nullable();
            $table->integer('allowed_equipment_units_qty')->nullable();
            $table->json('allowed_equipment')->nullable();
            $table->string('status')->default('available');
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venues');
    }
};
