<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        try {
            DB::statement("ALTER TABLE users MODIFY avatar LONGTEXT NULL");
        } catch (\Throwable $e) {}

        try {
            DB::statement("ALTER TABLE venues MODIFY avatar LONGTEXT NULL");
        } catch (\Throwable $e) {}
    }

    public function down(): void
    {
    }
};
