<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Replaces the two-column (condition_status + is_available) approach on equipment_units
     * with a single authoritative unit_status field.
     *
     * OLD columns removed:
     *   condition_status  string  default('good')     — ambiguous, mixed concerns
     *   is_available      boolean default(true)       — redundant once unit_status exists
     *
     * NEW columns added:
     *   unit_status       string  default('available') — see App\Enums\UnitStatus for
     *                                                    valid values:
     *                                                    available | checked_out | damaged
     *                                                    | under_repair | lost
     *                                                    'lost' is terminal (no return path).
     *                                                    'damaged' -> 'under_repair' -> 'available'
     *                                                    is the repair cycle.
     *   unit_status_notes text    nullable             — optional context for damage/repair.
     *                                                    No separate repair-history log for
     *                                                    capstone scope.
     *
     * NOTE: After this migration runs, assertQuantityAvailable() in
     * AvrEquipmentBorrowingService must be updated to count units WHERE
     * unit_status = 'available', replacing the old is_available = true check.
     * The hallucinated 'ongoing' conflict-check on line 231 of that service
     * must also be removed at the same time.
     */
    public function up(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->dropColumn('condition_status');
            $table->dropColumn('is_available');

            $table->string('unit_status')->default('available')->after('barcode');
            $table->text('unit_status_notes')->nullable()->after('unit_status');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_units', function (Blueprint $table) {
            $table->dropColumn('unit_status_notes');
            $table->dropColumn('unit_status');

            $table->string('condition_status')->default('good');
            $table->boolean('is_available')->default(true);
        });
    }
};
