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
            $table->integer('damaged_count')->default(0)->after('available_count');
            $table->integer('lost_count')->default(0)->after('damaged_count');
            $table->integer('released_count')->default(0)->after('lost_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_types', function (Blueprint $table) {
            $table->dropColumn(['damaged_count', 'lost_count', 'released_count']);
        });
    }
};
