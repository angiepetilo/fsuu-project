<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communication_logs', function (Blueprint $table) {
            $table->id();

            $table->string('channel')->default('email'); // 'email', 'sms', 'notification'
            $table->string('category')->index(); // 'venue_confirmation', 'equipment_confirmation', 'status_update', 'urgent_reminder', 'overdue_reminder', 'venue_day_reminder', 'user_credentials', 'test_email'
            
            $table->string('recipient_name')->nullable();
            $table->string('recipient_email')->nullable()->index();
            $table->string('recipient_phone')->nullable();
            $table->string('reference_code')->nullable()->index(); // e.g. TRK-AVR2009, EQ-2026-00003

            $table->string('subject')->nullable();
            $table->text('message_preview')->nullable();

            $table->string('status')->default('sent'); // 'sent', 'failed', 'queued'
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communication_logs');
    }
};
