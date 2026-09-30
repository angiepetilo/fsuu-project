<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_types', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_types', 'built_in_count')) {
                $table->integer('built_in_count')->default(0)->after('available_count');
            }
            if (!Schema::hasColumn('equipment_types', 'unavailable_count')) {
                $table->integer('unavailable_count')->default(0)->after('built_in_count');
            }
            if (!Schema::hasColumn('equipment_types', 'reserved_count')) {
                $table->integer('reserved_count')->default(0)->after('unavailable_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('equipment_types', function (Blueprint $table) {
            $cols = ['built_in_count', 'unavailable_count', 'reserved_count'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('equipment_types', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
