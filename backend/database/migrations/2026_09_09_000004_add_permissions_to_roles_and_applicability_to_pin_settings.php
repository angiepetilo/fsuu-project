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
        if (Schema::hasTable('roles') && !Schema::hasColumn('roles', 'permissions')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->json('permissions')->nullable()->after('description');
            });
        }

        if (Schema::hasTable('verification_pin_settings') && !Schema::hasColumn('verification_pin_settings', 'applicability_matrix')) {
            Schema::table('verification_pin_settings', function (Blueprint $table) {
                $table->json('applicability_matrix')->nullable()->after('equipment_verify_phone');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('roles') && Schema::hasColumn('roles', 'permissions')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->dropColumn('permissions');
            });
        }

        if (Schema::hasTable('verification_pin_settings') && Schema::hasColumn('verification_pin_settings', 'applicability_matrix')) {
            Schema::table('verification_pin_settings', function (Blueprint $table) {
                $table->dropColumn('applicability_matrix');
            });
        }
    }
};
