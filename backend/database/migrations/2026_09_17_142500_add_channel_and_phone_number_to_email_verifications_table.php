<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('email_verifications')) {
            if (!Schema::hasColumn('email_verifications', 'channel')) {
                Schema::table('email_verifications', function (Blueprint $table) {
                    $table->string('channel', 20)->default('email');
                });
            }
            if (!Schema::hasColumn('email_verifications', 'phone_number')) {
                Schema::table('email_verifications', function (Blueprint $table) {
                    $table->string('phone_number', 50)->nullable();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('email_verifications')) {
            if (Schema::hasColumn('email_verifications', 'phone_number')) {
                Schema::table('email_verifications', function (Blueprint $table) {
                    $table->dropColumn('phone_number');
                });
            }
            if (Schema::hasColumn('email_verifications', 'channel')) {
                Schema::table('email_verifications', function (Blueprint $table) {
                    $table->dropColumn('channel');
                });
            }
        }
    }
};
