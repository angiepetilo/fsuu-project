<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_requirements', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_requirements', 'template_display_mode')) {
                $table->string('template_display_mode')->default('download')->after('template_file_name');
            }
            if (!Schema::hasColumn('booking_requirements', 'format_content')) {
                $table->longText('format_content')->nullable()->after('template_display_mode');
            }
            if (!Schema::hasColumn('booking_requirements', 'sort_order')) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('format_content');
            }
            if (!Schema::hasColumn('booking_requirements', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('updated_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('booking_requirements', function (Blueprint $table) {
            $colsToDrop = [];
            foreach (['template_display_mode', 'format_content', 'sort_order', 'archived_at'] as $col) {
                if (Schema::hasColumn('booking_requirements', $col)) {
                    $colsToDrop[] = $col;
                }
            }
            if (!empty($colsToDrop)) {
                $table->dropColumn($colsToDrop);
            }
        });
    }
};
