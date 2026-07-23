<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Staff permissions table — replaces the old permissions + user_permissions tables
     * for the Staff-facing permission model introduced in the July 2026 architecture update.
     *
     * Columns:
     *   staff_id    — the Staff user being granted the permission
     *   office_id   — denormalised from users.office_id; kept explicit so queries can
     *                 assert office-match without a join. NOTE: MySQL cannot enforce
     *                 staff_permissions.office_id = users.office_id via a CHECK constraint
     *                 because CHECK constraints cannot span tables. This is enforced at the
     *                 application layer (Service/Form Request) — not by the DB engine.
     *   area        — equipment_management | venue_management | equipment_borrowing
     *                   | venue_booking | inventory | reports
     *   action      — approve | assign_checkout | add_edit
     *   granted_by  — the Admin user who granted this permission
     *
     * Unique constraint on (staff_id, area, action): one row per staff/area/action combo.
     * No updated_at — permissions are revoked by deletion, not update.
     */
    public function up(): void
    {
        Schema::create('staff_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')
                ->constrained('users')
                ->cascadeOnDelete(); // if Staff account deleted, remove their permissions
            $table->foreignId('office_id')
                ->constrained('offices')
                ->cascadeOnDelete();
            $table->string('area');   // see valid values in App\Enums\PermissionArea
            $table->string('action'); // see valid values in App\Enums\PermissionAction
            $table->foreignId('granted_by')
                ->constrained('users')
                ->restrictOnDelete(); // prevent deleting the Admin who granted — must revoke first
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['staff_id', 'area', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_permissions');
    }
};
