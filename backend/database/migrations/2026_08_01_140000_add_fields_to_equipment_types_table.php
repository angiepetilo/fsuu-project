<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_types', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_types', 'barcode')) {
                $table->string('barcode')->nullable()->after('eq_type');
            }
            if (!Schema::hasColumn('equipment_types', 'avatar')) {
                $table->longText('avatar')->nullable()->after('barcode');
            }
            if (!Schema::hasColumn('equipment_types', 'status')) {
                $table->string('status')->default('available')->after('avatar');
            }
            if (!Schema::hasColumn('equipment_types', 'total_quantity')) {
                $table->integer('total_quantity')->default(1)->after('status');
            }
            if (!Schema::hasColumn('equipment_types', 'available_count')) {
                $table->integer('available_count')->default(1)->after('total_quantity');
            }
            if (!Schema::hasColumn('equipment_types', 'date_purchased')) {
                $table->date('date_purchased')->nullable()->after('available_count');
            }
            if (!Schema::hasColumn('equipment_types', 'lifespan_years')) {
                $table->integer('lifespan_years')->default(5)->after('date_purchased');
            }
            if (!Schema::hasColumn('equipment_types', 'description')) {
                $table->text('description')->nullable()->after('lifespan_years');
            }
        });
    }

    public function down(): void
    {
        Schema::table('equipment_types', function (Blueprint $table) {
            $table->dropColumn([
                'barcode',
                'avatar',
                'status',
                'total_quantity',
                'available_count',
                'date_purchased',
                'lifespan_years',
                'description',
            ]);
        });
    }
};
