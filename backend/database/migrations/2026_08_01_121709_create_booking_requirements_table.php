<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_requirements', function (Blueprint $table) {
            $table->id();
            $table->string('classification')->default('all');
            $table->string('label');
            $table->text('description')->nullable();
            $table->text('template_file_url')->nullable();
            $table->string('template_file_name')->nullable();
            $table->string('template_display_mode')->default('download');
            $table->longText('format_content')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_requirements');
    }
};