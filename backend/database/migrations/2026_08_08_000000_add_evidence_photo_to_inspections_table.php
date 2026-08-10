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
                if (!Schema::hasColumn('inspections', 'evidence_photo')) {
                    $table->longText('evidence_photo')->nullable();
                }
                if (!Schema::hasColumn('inspections', 'violation_type')) {
                    $table->string('violation_type')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('inspections')) {
            Schema::table('inspections', function (Blueprint $table) {
                if (Schema::hasColumn('inspections', 'evidence_photo')) {
                    $table->dropColumn('evidence_photo');
                }
                if (Schema::hasColumn('inspections', 'violation_type')) {
                    $table->dropColumn('violation_type');
                }
            });
        }
    }
};
