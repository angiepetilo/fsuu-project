<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('office_id')->nullable()->constrained('offices')->nullOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('username')->nullable()->unique();
            $table->string('email')->unique();
            $table->string('personal_email')->nullable()->unique();
            $table->string('google_id')->nullable()->unique();
            $table->longText('avatar')->nullable();
            $table->string('password');
            $table->string('invite_token')->nullable();
            $table->timestamp('invited_at')->nullable();
            $table->string('location')->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('status')->default('active');
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
