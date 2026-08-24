<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_types', function (Blueprint $table) {
            $table->id();
            $table->string('eq_name');
            $table->string('eq_type');
            $table->longText('avatar')->nullable();
            $table->string('status')->default('available');
            $table->integer('total_quantity')->default(1);
            $table->integer('available_count')->default(1);
            $table->integer('damaged_count')->default(0);
            $table->integer('lost_count')->default(0);
            $table->integer('released_count')->default(0);
            $table->date('date_purchased')->nullable();
            $table->integer('lifespan_years')->default(5);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_types');
    }
};
