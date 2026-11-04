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
        if (Schema::hasTable('system_settings') && !Schema::hasColumn('system_settings', 'sms_sender_name')) {
            Schema::table('system_settings', function (Blueprint $table) {
                $table->string('sms_sender_name')->nullable()->default('FSUU_AVR')->after('sms_api_url');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('system_settings') && Schema::hasColumn('system_settings', 'sms_sender_name')) {
            Schema::table('system_settings', function (Blueprint $table) {
                $table->dropColumn('sms_sender_name');
            });
        }
    }
};
