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
                'code' => 'CITEC',
                'name' => 'College of Information, Technology, Entertainment, and Computing (CITEC)',
            ],
            [
                'code' => 'CCJE',
                'name' => 'College of Criminal Justice Education (CCJE)',
            ],
            [
                'code' => 'CTE',
                'name' => 'College of Teacher Education (CTE)',
            ],
            [
                'code' => 'CoA',
                'name' => 'College of Accountancy (CoA)',
            ],
            [
                'code' => 'CoN',
                'name' => 'College of Nursing (CoN)',
            ],
            [
                'code' => 'CAS',
                'name' => 'College of Arts and Sciences (CAS)',
            ],
            [
                'code' => 'CORE',
                'name' => 'College of Operations, Resources, and Entrepreneurship (CORE)',
            ],
            [
                'code' => 'CEnTech',
                'name' => 'College of Engineering and Technology (CEnTech)',
            ],
            [
                'code' => 'CIHT',
                'name' => 'College of Innovative Hospitality and Tourism (CIHT)',
            ],
        ];

        foreach ($colleges as $dept) {
            Department::updateOrCreate(
                ['name' => $dept['name']],
                [
                    'code' => $dept['code'],
                ]
            );
        }
    }
}
