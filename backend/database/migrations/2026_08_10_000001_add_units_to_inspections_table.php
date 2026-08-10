<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('inspections')) {
            Schema::table('inspections', function (Blueprint $table) {
                if (!Schema::hasColumn('inspections', 'assigned_units')) {
                    $table->longText('assigned_units')->nullable();
                }
                if (!Schema::hasColumn('inspections', 'unit_conditions')) {
                    $table->longText('unit_conditions')->nullable();
                }
                if (!Schema::hasColumn('inspections', 'reference_type')) {
                    $table->string('reference_type')->nullable();
                }
                if (!Schema::hasColumn('inspections', 'reference_id')) {
                    $table->unsignedBigInteger('reference_id')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('inspections')) {
            Schema::table('inspections', function (Blueprint $table) {
                if (Schema::hasColumn('inspections', 'assigned_units')) {
                    $table->dropColumn('assigned_units');
                }
                if (Schema::hasColumn('inspections', 'unit_conditions')) {
                    $table->dropColumn('unit_conditions');
                }
                if (Schema::hasColumn('inspections', 'reference_type')) {
                    $table->dropColumn('reference_type');
                }
                if (Schema::hasColumn('inspections', 'reference_id')) {
                    $table->dropColumn('reference_id');
                }
            });
        }
    }
};
