<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop legacy permissions + user_permissions tables.
     *
     * Prerequisites confirmed before this migration was written:
     *   1. All Policy hasPermission() calls updated to new area+action model (✅ done)
     *   2. All tests updated from Permission::create()+attach() to StaffPermission::forceCreate() (✅ done)
     *   3. Full audit showed zero remaining live code dependencies on these tables (✅ done)
     *   4. Dependent models (Permission, UserPermission) kept for now — drop them via a
     *      separate PR after confirming nothing else references them.
     *
     * Rollback (down): recreates both tables in their original form.
     */
    public function up(): void
    {
        Schema::dropIfExists('user_permissions');
        Schema::dropIfExists('permissions');
    }

    public function down(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->timestamps();
        });

        Schema::create('user_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->foreignId('granted_by')->constrained('users');
            $table->unique(['user_id', 'permission_id']);
            $table->timestamp('created_at')->useCurrent();
        });
    }
};
