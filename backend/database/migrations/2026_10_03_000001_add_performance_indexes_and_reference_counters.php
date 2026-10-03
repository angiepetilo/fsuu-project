<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Performance optimization: adds composite and single-column indexes on critical
     * transaction query paths and creates the atomic sequence counter table.
     * ZERO changes to application logic.
     */
    public function up(): void
    {
        // 1. Reference Counters Table (for atomic sequence generation in ReferenceCodeService)
        if (!Schema::hasTable('reference_counters')) {
            Schema::create('reference_counters', function (Blueprint $table) {
                $table->id();
                $table->string('prefix', 10);
                $table->string('year_month', 10);
                $table->unsignedInteger('last_number')->default(0);
                $table->timestamps();

                $table->unique(['prefix', 'year_month'], 'ref_counters_prefix_ym_unique');
            });
        }

        // 2. Tracking Numbers Indexes (frequent status filter and reservation polymorphic lookups)
        if (Schema::hasTable('tracking_numbers')) {
            Schema::table('tracking_numbers', function (Blueprint $table) {
                if (!Schema::hasIndex('tracking_numbers', 'tn_status_idx')) {
                    $table->index('status', 'tn_status_idx');
                }
                if (!Schema::hasIndex('tracking_numbers', 'tn_res_type_id_idx')) {
                    $table->index(['reservation_type', 'reservation_id'], 'tn_res_type_id_idx');
                }
            });
        }

        // 3. Venue Bookings Performance Indexes (collision checks & anti-spam duplicate guards)
        if (Schema::hasTable('venue_bookings')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                if (!Schema::hasIndex('venue_bookings', 'vb_collision_check_idx')) {
                    $table->index(['venue_id', 'date_of_usage', 'reservation_end_date', 'time_start', 'time_end'], 'vb_collision_check_idx');
                }
                if (!Schema::hasIndex('venue_bookings', 'vb_antispam_idx')) {
                    $table->index(['venue_id', 'created_at', 'date_of_usage'], 'vb_antispam_idx');
                }
            });
        }

        // 4. Equipment Borrows Performance Indexes (schedule conflict checks & anti-spam)
        if (Schema::hasTable('equipment_borrows')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                if (!Schema::hasIndex('equipment_borrows', 'eb_schedule_idx')) {
                    $table->index(['date_of_usage', 'time_start', 'time_end'], 'eb_schedule_idx');
                }
                if (!Schema::hasIndex('equipment_borrows', 'eb_email_created_idx')) {
                    $table->index(['email_address', 'created_at'], 'eb_email_created_idx');
                }
            });
        }

        // 5. Equipment Units Barcode and Stock Status Indexes (barcode scanning & availability lookups)
        if (Schema::hasTable('equipment_units')) {
            Schema::table('equipment_units', function (Blueprint $table) {
                if (!Schema::hasIndex('equipment_units', 'eu_barcode_idx')) {
                    $table->index('barcode', 'eu_barcode_idx');
                }
                if (!Schema::hasIndex('equipment_units', 'eu_stock_status_idx')) {
                    $table->index(['equipment_type_id', 'status', 'condition'], 'eu_stock_status_idx');
                }
            });
        }

        // 6. Documents Foreign Key Lookups
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if (!Schema::hasIndex('documents', 'docs_eb_id_idx')) {
                    $table->index('equipment_borrow_id', 'docs_eb_id_idx');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if (Schema::hasIndex('documents', 'docs_eb_id_idx')) {
                    $table->dropIndex('docs_eb_id_idx');
                }
            });
        }

        if (Schema::hasTable('equipment_units')) {
            Schema::table('equipment_units', function (Blueprint $table) {
                if (Schema::hasIndex('equipment_units', 'eu_barcode_idx')) {
                    $table->dropIndex('eu_barcode_idx');
                }
                if (Schema::hasIndex('equipment_units', 'eu_stock_status_idx')) {
                    $table->dropIndex('eu_stock_status_idx');
                }
            });
        }

        if (Schema::hasTable('equipment_borrows')) {
            Schema::table('equipment_borrows', function (Blueprint $table) {
                if (Schema::hasIndex('equipment_borrows', 'eb_schedule_idx')) {
                    $table->dropIndex('eb_schedule_idx');
                }
                if (Schema::hasIndex('equipment_borrows', 'eb_email_created_idx')) {
                    $table->dropIndex('eb_email_created_idx');
                }
            });
        }

        if (Schema::hasTable('venue_bookings')) {
            Schema::table('venue_bookings', function (Blueprint $table) {
                if (Schema::hasIndex('venue_bookings', 'vb_collision_check_idx')) {
                    $table->dropIndex('vb_collision_check_idx');
                }
                if (Schema::hasIndex('venue_bookings', 'vb_antispam_idx')) {
                    $table->dropIndex('vb_antispam_idx');
                }
            });
        }

        if (Schema::hasTable('tracking_numbers')) {
            Schema::table('tracking_numbers', function (Blueprint $table) {
                if (Schema::hasIndex('tracking_numbers', 'tn_status_idx')) {
                    $table->dropIndex('tn_status_idx');
                }
                if (Schema::hasIndex('tracking_numbers', 'tn_res_type_id_idx')) {
                    $table->dropIndex('tn_res_type_id_idx');
                }
            });
        }

        Schema::dropIfExists('reference_counters');
    }
};
