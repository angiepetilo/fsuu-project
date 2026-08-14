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

        $email = env('INITIAL_SUPERADMIN_EMAIL') ?: 'admin';
        $password = env('INITIAL_SUPERADMIN_PASSWORD') ?: 'password123';

        // 1. Primary Super Admin Account
        User::withTrashed()->updateOrCreate(
            ['email' => $email],
            [
                'name'           => 'Super Administrator',
                'email'          => $email,
                'personal_email' => 'admin.personal@fsuu.edu.ph',
                'password'       => Hash::make($password),
                'role_id'        => $superAdminRole->id,
                'office_id'      => null,
                'created_by'     => null,
                'is_active'      => true,
                'status'         => 'active',
                'archived_at'    => null,
            ]
        );
    }
}
