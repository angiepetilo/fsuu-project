<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [
                'code' => 'CITEC',
                'name' => 'College of Information, Technology, Entertainment, and Computing (CITEC)',
                'department_name' => 'College of Information, Technology, Entertainment, and Computing (CITEC)',
            ],
            [
                'code' => 'CCJE',
                'name' => 'College of Criminal Justice Education (CCJE)',
                'department_name' => 'College of Criminal Justice Education (CCJE)',
            ],
            [
                'code' => 'CTE',
                'name' => 'College of Teacher Education (CTE)',
                'department_name' => 'College of Teacher Education (CTE)',
            ],
            [
                'code' => 'CoA',
                'name' => 'College of Accountancy (CoA)',
                'department_name' => 'College of Accountancy (CoA)',
            ],
            [
                'code' => 'CoN',
                'name' => 'College of Nursing (CoN)',
                'department_name' => 'College of Nursing (CoN)',
            ],
            [
                'code' => 'CAS',
                'name' => 'College of Arts and Sciences (CAS)',
                'department_name' => 'College of Arts and Sciences (CAS)',
            ],
            [
                'code' => 'CORE',
                'name' => 'College of Operations, Resources, and Entrepreneurship (CORE)',
                'department_name' => 'College of Operations, Resources, and Entrepreneurship (CORE)',
            ],
            [
                'code' => 'CEnTech',
                'name' => 'College of Engineering and Technology (CEnTech)',
                'department_name' => 'College of Engineering and Technology (CEnTech)',
            ],
            [
                'code' => 'CIHT',
                'name' => 'College of Innovative Hospitality and Tourism (CIHT)',
                'department_name' => 'College of Innovative Hospitality and Tourism (CIHT)',
            ],
        ];

        foreach ($departments as $dept) {
            Department::updateOrCreate(
                ['code' => $dept['code']],
                [
                    'name' => $dept['name'],
                    'department_name' => $dept['department_name'],
                ]
            );
        }
    }
}
