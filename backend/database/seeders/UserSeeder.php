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
        $superAdminRole = Role::where('name', 'super_admin')->first();
        $adminRole      = Role::where('name', 'admin')->first();
        $staffRole      = Role::where('name', 'staff')->first();

        $mainOffice    = Office::where('slug', 'fsuu-main')->first();
        $morelosOffice = Office::where('slug', 'fsuu-morelos')->first();

        // 1. Super Admin (office_id = null)
        $superAdmin = User::where('email', 'superadmin@fsuu.edu.ph')->first();
        if (!$superAdmin) {
            $superAdmin = new User();
            $superAdmin->forceFill([
                'name'       => 'Super Administrator',
                'email'      => 'superadmin@fsuu.edu.ph',
                'password'   => Hash::make('password123'),
                'role_id'    => $superAdminRole->id,
                'office_id'  => null,
                'created_by' => null,
                'is_active'  => true,
            ]);
            $superAdmin->save();
        }

        // 2. FSUU Main Admin & Staff
        if ($mainOffice) {
            $mainAdmin = User::where('email', 'admin.main@fsuu.edu.ph')->first();
            if (!$mainAdmin) {
                $mainAdmin = new User();
                $mainAdmin->forceFill([
                    'name'       => 'Main Branch Admin',
                    'email'      => 'admin.main@fsuu.edu.ph',
                    'password'   => Hash::make('password123'),
                    'role_id'    => $adminRole->id,
                    'office_id'  => $mainOffice->id,
                    'created_by' => $superAdmin->id,
                    'is_active'  => true,
                ]);
                $mainAdmin->save();
            }

            $mainStaff = User::where('email', 'staff.main@fsuu.edu.ph')->first();
            if (!$mainStaff) {
                $mainStaff = new User();
                $mainStaff->forceFill([
                    'name'       => 'Main Branch Staff',
                    'email'      => 'staff.main@fsuu.edu.ph',
                    'password'   => Hash::make('password123'),
                    'role_id'    => $staffRole->id,
                    'office_id'  => $mainOffice->id,
                    'created_by' => $mainAdmin->id,
                    'is_active'  => true,
                ]);
                $mainStaff->save();
            }
        }

        // 3. FSUU Morelos Admin & Staff
        if ($morelosOffice) {
            $morelosAdmin = User::where('email', 'admin.morelos@fsuu.edu.ph')->first();
            if (!$morelosAdmin) {
                $morelosAdmin = new User();
                $morelosAdmin->forceFill([
                    'name'       => 'Morelos Branch Admin',
                    'email'      => 'admin.morelos@fsuu.edu.ph',
                    'password'   => Hash::make('password123'),
                    'role_id'    => $adminRole->id,
                    'office_id'  => $morelosOffice->id,
                    'created_by' => $superAdmin->id,
                    'is_active'  => true,
                ]);
                $morelosAdmin->save();
            }

            $morelosStaff = User::where('email', 'staff.morelos@fsuu.edu.ph')->first();
            if (!$morelosStaff) {
                $morelosStaff = new User();
                $morelosStaff->forceFill([
                    'name'       => 'Morelos Branch Staff',
                    'email'      => 'staff.morelos@fsuu.edu.ph',
                    'password'   => Hash::make('password123'),
                    'role_id'    => $staffRole->id,
                    'office_id'  => $morelosOffice->id,
                    'created_by' => $morelosAdmin->id,
                    'is_active'  => true,
                ]);
                $morelosStaff->save();
            }
        }
    }
}
