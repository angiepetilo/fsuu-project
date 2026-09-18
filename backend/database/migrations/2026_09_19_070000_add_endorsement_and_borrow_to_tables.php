<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('equipment_borrows')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                if (!Schema::hasColumn('equipment_borrows', 'endorsement_url')) {
                    $table->string('endorsement_url')->nullable();
                }
                if (!Schema::hasColumn('equipment_borrows', 'endorsement_letter')) {
                    $table->string('endorsement_letter')->nullable();
                }
            });
        }

        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if (!Schema::hasColumn('documents', 'reservation_type')) {
                    $table->string('reservation_type')->nullable();
                }
                if (!Schema::hasColumn('documents', 'reservation_id')) {
                    $table->unsignedBigInteger('reservation_id')->nullable();
                }
                if (!Schema::hasColumn('documents', 'equipment_borrow_id')) {
                    $table->unsignedBigInteger('equipment_borrow_id')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('equipment_borrows')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                if (Schema::hasColumn('equipment_borrows', 'endorsement_url')) {
                    $table->dropColumn('endorsement_url');
                }
                if (Schema::hasColumn('equipment_borrows', 'endorsement_letter')) {
                    $table->dropColumn('endorsement_letter');
                }
            });
        }

        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if (Schema::hasColumn('documents', 'reservation_type')) {
                    $table->dropColumn('reservation_type');
                }
                if (Schema::hasColumn('documents', 'reservation_id')) {
                    $table->dropColumn('reservation_id');
                }
                if (Schema::hasColumn('documents', 'equipment_borrow_id')) {
                    $table->dropColumn('equipment_borrow_id');
                }
            });
        }
    }
};
