<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add Google OAuth fields to users table.
     * - google_id:  The user's stable Google subject ID (used for lookup on callback)
     * - avatar:     Profile photo URL from Google (nullable, display-only)
     * - password:   Made nullable — Admin/Staff authenticate via Google, not password.
     *               Kept in schema for potential fallback/testing use.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('email');
            $table->string('avatar')->nullable()->after('google_id');
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_id');
            $table->dropColumn('avatar');
            $table->string('password')->nullable(false)->change();
        });
    }
};
