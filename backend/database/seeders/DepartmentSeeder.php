<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $colleges = [
            [
                'code'            => 'CITEC',
                'name'            => 'College of Information, Technology, Entertainment, and Computing (CITEC)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CCJE',
                'name'            => 'College of Criminal Justice Education (CCJE)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CTE',
                'name'            => 'College of Teacher Education (CTE)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CoA',
                'name'            => 'College of Accountancy (CoA)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CoN',
                'name'            => 'College of Nursing (CoN)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CAS',
                'name'            => 'College of Arts and Sciences (CAS)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CORE',
                'name'            => 'College of Operations, Resources, and Entrepreneurship (CORE)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CEnTech',
                'name'            => 'College of Engineering and Technology (CEnTech)',
                'campus_location' => 'Main Campus',
            ],
            [
                'code'            => 'CIHT',
                'name'            => 'College of Innovative Hospitality and Tourism (CIHT)',
                'campus_location' => 'Main Campus',
            ],
        ];

        foreach ($colleges as $dept) {
            Department::updateOrCreate(
                ['name' => $dept['name']],
                [
                    'code'            => $dept['code'],
                    'campus_location' => $dept['campus_location'],
                ]
            );
        }
    }
}
