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
        $adminRole      = Role::firstOrCreate(['name' => 'admin']);
        $staffRole      = Role::firstOrCreate(['name' => 'staff']);

        // ── 2. Primary Super Admin Account ───────────────────────────────────
        $superAdminEmail    = env('INITIAL_SUPERADMIN_EMAIL') ?: 'superadmin@fsuu.edu.ph';
        $superAdminPassword = env('INITIAL_SUPERADMIN_PASSWORD') ?: 'password123';

        User::withTrashed()->updateOrCreate(
            ['email' => $superAdminEmail],
            [
                'name'           => 'Super Administrator',
                'email'          => $superAdminEmail,
                'personal_email' => 'superadmin.personal@fsuu.edu.ph',
                'password'       => Hash::make($superAdminPassword),
                'role_id'        => $superAdminRole->id,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => ['*'],
                'archived_at'    => null,
            ]
        );

        // ── 3. Single Admin Account ──────────────────────────────────────────
        $adminEmail    = env('INITIAL_ADMIN_EMAIL') ?: 'admin@fsuu.edu.ph';
        $adminPassword = env('INITIAL_ADMIN_PASSWORD') ?: 'password123';

        User::withTrashed()->updateOrCreate(
            ['email' => $adminEmail],
            [
                'name'           => 'Administrator',
                'email'          => $adminEmail,
                'personal_email' => 'admin.personal@fsuu.edu.ph',
                'password'       => Hash::make($adminPassword),
                'role_id'        => $adminRole->id,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => ['*'],
                'archived_at'    => null,
            ]
        );

        // ── 4. Single Staff Account ──────────────────────────────────────────
        $staffEmail    = env('INITIAL_STAFF_EMAIL') ?: 'staff@fsuu.edu.ph';
        $staffPassword = env('INITIAL_STAFF_PASSWORD') ?: 'password123';

        User::withTrashed()->updateOrCreate(
            ['email' => $staffEmail],
            [
                'name'           => 'Staff',
                'email'          => $staffEmail,
                'personal_email' => 'staff.personal@fsuu.edu.ph',
                'password'       => Hash::make($staffPassword),
                'role_id'        => $staffRole->id,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => [
                    'equipment_borrowing',
                    'venue_booking',
                    'reports',
                    'scanner',
                ],
                'archived_at'    => null,
            ]
        );
    }
}
