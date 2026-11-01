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
        // Ensure standard roles exist with default descriptions
        $superAdminRole = Role::firstOrCreate(
            ['name' => 'super_admin'],
            [
                'description' => 'Unrestricted system access with full administrative privileges.',
                'permissions' => ['*'],
            ]
        );
        Role::firstOrCreate(
            ['name' => 'staff'],
            [
                'description' => 'AVR and venue operations staff.',
                'permissions' => [],
            ]
        );
        Role::firstOrCreate(
            ['name' => 'student_assistant'],
            [
                'description' => 'Student Assistant desk operations.',
                'permissions' => [],
            ]
        );
        $adminEmail = env('ADMIN_EMAIL', env('INITIAL_SUPERADMIN_EMAIL', 'admin@urios.edu.ph'));
        $adminPassword = Hash::make(env('ADMIN_PASSWORD', env('INITIAL_SUPERADMIN_PASSWORD', 'password123')));
        $adminName = env('ADMIN_NAME', 'System Administrator');

        // Primary Administrator (short as 'admin')
        User::withTrashed()->updateOrCreate(
            ['email' => $adminEmail],
            [
                'name'           => $adminName,
                'first_name'     => 'System',
                'last_name'      => 'Admin',
                'email_address'  => $adminEmail,
                'email'          => $adminEmail,
                'password'       => $adminPassword,
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
