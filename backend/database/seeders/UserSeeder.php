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
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        $superAdminEmail = env('INITIAL_SUPERADMIN_EMAIL') ?: 'superadmin@fsuu.edu.ph';
        $superAdminPassword = env('INITIAL_SUPERADMIN_PASSWORD') ?: 'password123';

        // 1. Primary Super Admin Account
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
                'archived_at'    => null,
            ]
        );

        $avrAdminEmail = env('INITIAL_AVRADMIN_EMAIL') ?: 'admin.avr@fsuu.edu.ph';
        $avrAdminPassword = env('INITIAL_AVRADMIN_PASSWORD') ?: 'password123';

        // 2. AVR Office Admin Account
        User::withTrashed()->updateOrCreate(
            ['email' => $avrAdminEmail],
            [
                'name'           => 'AVR Office Admin',
                'email'          => $avrAdminEmail,
                'personal_email' => 'admin.avr.personal@fsuu.edu.ph',
                'password'       => Hash::make($avrAdminPassword),
                'role_id'        => $adminRole->id,
                'office_id'      => null,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'archived_at'    => null,
            ]
        );
    }
}
