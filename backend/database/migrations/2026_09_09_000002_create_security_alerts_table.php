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
        if (!Schema::hasTable('security_alerts')) {
            Schema::create('security_alerts', function (Blueprint $table) {
                $table->id();
                $table->string('event_type'); // rate_limit_breach, login_lockout, forced_session_termination, suspicious_activity
                $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
                $table->string('title');
                $table->text('description');
                $table->string('ip_address')->nullable();
                $table->text('user_agent')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->json('metadata')->nullable();
                $table->enum('status', ['unresolved', 'resolved', 'investigating', 'dismissed'])->default('unresolved');
                $table->timestamp('resolved_at')->nullable();
                $table->unsignedBigInteger('resolved_by')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
                $table->foreign('resolved_by')->references('id')->on('users')->onDelete('set null');
                $table->index(['event_type', 'status']);
                $table->index('created_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_alerts');
    }
};
