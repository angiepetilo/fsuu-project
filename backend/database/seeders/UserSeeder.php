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
        $defaultPassword = Hash::make(env('INITIAL_SUPERADMIN_PASSWORD', 'password123'));

        // 1. Super Administrator
        User::withTrashed()->updateOrCreate(
            ['email' => 'superadmin@urios.edu.ph'],
            [
                'name'           => 'Super Administrator',
                'first_name'     => 'Super',
                'last_name'      => 'Administrator',
                'email_address'  => 'superadmin@urios.edu.ph',
                'email'          => 'superadmin@urios.edu.ph',
                'password'       => $defaultPassword,
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
