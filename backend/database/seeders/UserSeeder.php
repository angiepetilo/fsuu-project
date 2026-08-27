<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Ensure Standard Roles Exist ──────────────────────────────────
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        // ── 2. Primary Super Admin Account ───────────────────────────────────
        $superAdminEmail    = env('INITIAL_SUPERADMIN_EMAIL') ?: 'superadmin@fsuu.edu.ph';
        $superAdminPassword = env('INITIAL_SUPERADMIN_PASSWORD') ?: 'password123';

        User::withTrashed()->updateOrCreate(
            ['email' => $superAdminEmail],
            [
                'name'           => 'Super Administrator',
                'first_name'     => 'Super',
                'last_name'      => 'Administrator',
                'email_address'  => $superAdminEmail,
                'email'          => $superAdminEmail,
                'password'       => Hash::make($superAdminPassword),
                'role_id'        => $superAdminRole->id,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => ['*'],
                'archived_at'    => null,
            ]
        );
    }
}
