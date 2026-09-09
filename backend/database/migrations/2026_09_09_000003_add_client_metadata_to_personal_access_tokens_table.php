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
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            if (!Schema::hasColumn('personal_access_tokens', 'ip_address')) {
                $table->string('ip_address', 45)->nullable()->after('abilities');
            }
            if (!Schema::hasColumn('personal_access_tokens', 'user_agent')) {
                $table->text('user_agent')->nullable()->after('ip_address');
            }
            if (!Schema::hasColumn('personal_access_tokens', 'device_name')) {
                $table->string('device_name')->nullable()->after('user_agent');
            }
            if (!Schema::hasColumn('personal_access_tokens', 'is_revoked')) {
                $table->boolean('is_revoked')->default(false)->after('device_name');
            }
            if (!Schema::hasColumn('personal_access_tokens', 'revoked_at')) {
                $table->timestamp('revoked_at')->nullable()->after('is_revoked');
            }
            if (!Schema::hasColumn('personal_access_tokens', 'revoked_by')) {
                $table->unsignedBigInteger('revoked_by')->nullable()->after('revoked_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn(['ip_address', 'user_agent', 'device_name', 'is_revoked', 'revoked_at', 'revoked_by']);
        });
    }
};
