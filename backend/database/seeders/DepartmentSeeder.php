<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Office;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $officeMain = Office::where('name', 'AVR Office I')->first();
        $officeMorelos = Office::where('name', 'AVR Office II')->first();

        $departments = [
            // Morelos Campus Departments
            [
                'code'            => 'JHS',
                'name'            => 'Junior High School',
                'campus_location' => 'Morelos Campus',
                'office_id'       => $officeMorelos?->id,
            ],
            [
                'code'            => 'SHS',
                'name'            => 'Senior High School',
                'campus_location' => 'Morelos Campus',
                'office_id'       => $officeMorelos?->id,
            ],
            // Main Campus Departments
            [
                'code'            => 'CS',
                'name'            => 'Computer Science',
                'campus_location' => 'Main Campus',
                'office_id'       => $officeMain?->id,
            ],
            [
                'code'            => 'AP',
                'name'            => 'Accountancy Program',
                'campus_location' => 'Main Campus',
                'office_id'       => $officeMain?->id,
            ],
            [
                'code'            => 'NP',
                'name'            => 'Nursing Program',
                'campus_location' => 'Main Campus',
                'office_id'       => $officeMain?->id,
            ],
            [
                'code'            => 'ASP',
                'name'            => 'Arts and Science Program',
                'campus_location' => 'Main Campus',
                'office_id'       => $officeMain?->id,
            ],
        ];

        foreach ($departments as $dept) {
            Department::updateOrCreate(
                ['code' => $dept['code'], 'campus_location' => $dept['campus_location']],
                [
                    'name'      => $dept['name'],
                    'office_id' => $dept['office_id'],
                ]
            );
        }
    }
}
