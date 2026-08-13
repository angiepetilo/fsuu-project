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
        $superAdminRole = Role::where('name', 'super_admin')->first();

        $email = env('INITIAL_SUPERADMIN_EMAIL', 'admin@fsuu.edu.ph');
        $password = env('INITIAL_SUPERADMIN_PASSWORD', 'password123');

        // Initial Super Admin Account (Global Scope)
        User::withTrashed()->updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name'           => 'Super Administrator',
                'email'          => $email,
                'personal_email' => env('INITIAL_SUPERADMIN_PERSONAL_EMAIL', 'admin.personal@fsuu.edu.ph'),
                'password'       => Hash::make($password),
                'role_id'        => $superAdminRole?->id,
                'office_id'      => null,
                'created_by'     => null,
                'is_active'      => true,
                'archived_at'    => null,
            ]
        );
    }
}
