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
        // Ensure standard roles exist
        $superAdminRole       = Role::firstOrCreate(['name' => 'super_admin']);
        $defaultPassword = Hash::make(env('INITIAL_SUPERADMIN_PASSWORD', 'password123'));

        // 1. Super Administrator
        User::withTrashed()->updateOrCreate(
            ['email' => 'superadmin@fsuu.edu.ph'],
            [
                'name'           => 'Super Administrator',
                'first_name'     => 'Super',
                'last_name'      => 'Administrator',
                'email_address'  => 'superadmin@fsuu.edu.ph',
                'email'          => 'superadmin@fsuu.edu.ph',
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
