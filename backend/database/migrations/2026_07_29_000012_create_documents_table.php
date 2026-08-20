<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_booking_id')->constrained('venue_bookings')->cascadeOnDelete();
            $table->string('document_type'); // vp_acad_dsa_letter, adviser_org_endorsement, dsa_letter, dean_endorsement, letter_of_request_external
            $table->string('file_path');
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
