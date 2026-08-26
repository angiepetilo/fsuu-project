<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('venues') && !Schema::hasColumn('venues', 'allowed_equipment')) {
            Schema::table('venues', function (Blueprint $table) {
                $table->longText('allowed_equipment')->nullable()->after('capacity');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('venues') && Schema::hasColumn('venues', 'allowed_equipment')) {
            Schema::table('venues', function (Blueprint $table) {
                $table->dropColumn('allowed_equipment');
            });
        }
    }
};
