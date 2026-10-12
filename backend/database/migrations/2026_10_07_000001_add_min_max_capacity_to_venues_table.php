<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('venues')) {
            Schema::table('venues', function (Blueprint $table) {
                if (!Schema::hasColumn('venues', 'min_capacity')) {
                    $table->integer('min_capacity')->default(1)->nullable()->after('capacity');
                }
                if (!Schema::hasColumn('venues', 'max_capacity')) {
                    $table->integer('max_capacity')->default(100)->nullable()->after('min_capacity');
                }
            });

            // Backfill max_capacity from capacity if existing
            DB::table('venues')
                ->whereNull('max_capacity')
                ->update(['max_capacity' => DB::raw('COALESCE(capacity, 100)')]);

            DB::table('venues')
                ->whereNull('min_capacity')
                ->update(['min_capacity' => 1]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('venues')) {
            Schema::table('venues', function (Blueprint $table) {
                if (Schema::hasColumn('venues', 'min_capacity')) {
                    $table->dropColumn('min_capacity');
                }
                if (Schema::hasColumn('venues', 'max_capacity')) {
                    $table->dropColumn('max_capacity');
                }
            });
        }
    }
};
