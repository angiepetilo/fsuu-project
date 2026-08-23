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
        if (Schema::hasTable('system_settings') && !Schema::hasColumn('system_settings', 'header_brand_text')) {
            Schema::table('system_settings', function (Blueprint $table) {
                $table->string('header_brand_text')->default('Urios')->after('organization_name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('system_settings') && Schema::hasColumn('system_settings', 'header_brand_text')) {
            Schema::table('system_settings', function (Blueprint $table) {
                $table->dropColumn('header_brand_text');
            });
        }
    }
};
