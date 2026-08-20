<?php

namespace Database\Seeders;

use App\Models\Office;
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

        // ── 2. Get Default Office Reference ─────────────────────────────────
        $defaultOffice = Office::where('slug', 'avr-office-i-main-campus')->first() 
                      ?? Office::first();

        // ── 3. Primary Super Admin Account ───────────────────────────────────
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
                'office_id'      => null,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => ['*'],
                'archived_at'    => null,
            ]
        );

        // ── 4. Admin Account (admin@fsuu.edu.ph & admin.avr@fsuu.edu.ph) ──────
        $adminEmail    = env('INITIAL_ADMIN_EMAIL') ?: 'admin@fsuu.edu.ph';
        $adminPassword = env('INITIAL_ADMIN_PASSWORD') ?: 'password123';

        User::withTrashed()->updateOrCreate(
            ['email' => $adminEmail],
            [
                'name'           => 'AVR Office Admin',
                'email'          => $adminEmail,
                'personal_email' => 'admin.personal@fsuu.edu.ph',
                'password'       => Hash::make($adminPassword),
                'role_id'        => $adminRole->id,
                'office_id'      => $defaultOffice?->id,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => ['*'],
                'archived_at'    => null,
            ]
        );

        // Also seed admin.avr@fsuu.edu.ph alias if needed
        User::withTrashed()->updateOrCreate(
            ['email' => 'admin.avr@fsuu.edu.ph'],
            [
                'name'           => 'AVR Office Admin',
                'email'          => 'admin.avr@fsuu.edu.ph',
                'personal_email' => 'admin.avr.personal@fsuu.edu.ph',
                'password'       => Hash::make($adminPassword),
                'role_id'        => $adminRole->id,
                'office_id'      => $defaultOffice?->id,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'permissions'    => ['*'],
                'archived_at'    => null,
            ]
        );

        // ── 5. Staff Account (staff@fsuu.edu.ph & staff.avr@fsuu.edu.ph) ──────
        $staffEmail    = env('INITIAL_STAFF_EMAIL') ?: 'staff@fsuu.edu.ph';
        $staffPassword = env('INITIAL_STAFF_PASSWORD') ?: 'password123';

        User::withTrashed()->updateOrCreate(
            ['email' => $staffEmail],
            [
                'name'           => 'AVR Office Staff',
                'email'          => $staffEmail,
                'personal_email' => 'staff.personal@fsuu.edu.ph',
                'password'       => Hash::make($staffPassword),
                'role_id'        => $staffRole->id,
                'office_id'      => $defaultOffice?->id,
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

        User::withTrashed()->updateOrCreate(
            ['email' => 'staff.avr@fsuu.edu.ph'],
            [
                'name'           => 'AVR Office Staff',
                'email'          => 'staff.avr@fsuu.edu.ph',
                'personal_email' => 'staff.avr.personal@fsuu.edu.ph',
                'password'       => Hash::make($staffPassword),
                'role_id'        => $staffRole->id,
                'office_id'      => $defaultOffice?->id,
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
