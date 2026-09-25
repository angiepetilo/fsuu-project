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
        Schema::table('brands', function (Blueprint $table) {
            if (!Schema::hasColumn('brands', 'equipment_type_id')) {
                $table->foreignId('equipment_type_id')
                    ->nullable()
                    ->after('name')
                    ->constrained('equipment_types')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            if (Schema::hasColumn('brands', 'equipment_type_id')) {
                $table->dropForeign(['equipment_type_id']);
                $table->dropColumn('equipment_type_id');
            }
        });
    }
};
