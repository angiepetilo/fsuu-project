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

        $email = env('INITIAL_SUPERADMIN_EMAIL', 'superadmin@fsuu.edu.ph');
        $password = env('INITIAL_SUPERADMIN_PASSWORD', 'password123');

        // Super Admin Account (Environment-Driven & Idempotent)
        User::firstOrCreate(
            ['email' => $email],
            [
                'name'           => 'Super Administrator',
                'username'       => 'superadmin',
                'personal_email' => env('INITIAL_SUPERADMIN_PERSONAL_EMAIL', 'superadmin.personal@fsuu.edu.ph'),
                'password'       => Hash::make($password),
                'role_id'        => $superAdminRole->id,
                'office_id'      => null,
                'created_by'     => null,
                'is_active'      => true,
            ]
        );
    }
}
