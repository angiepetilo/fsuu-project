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
        Schema::table('equipment_types', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_types', 'photo_fit')) {
                $table->string('photo_fit', 20)->default('contain')->after('avatar');
            }
            if (!Schema::hasColumn('equipment_types', 'photo_scale')) {
                $table->integer('photo_scale')->default(100)->after('photo_fit');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_types', function (Blueprint $table) {
            if (Schema::hasColumn('equipment_types', 'photo_scale')) {
                $table->dropColumn('photo_scale');
            }
            if (Schema::hasColumn('equipment_types', 'photo_fit')) {
                $table->dropColumn('photo_fit');
            }
        });
    }
};
