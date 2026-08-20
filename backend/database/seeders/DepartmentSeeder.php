<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Office;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $office = Office::first();

        $colleges = [
            [
                'code'            => 'CITEC',
                'name'            => 'College of Information, Technology, Entertainment, and Computing (CITEC)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CCJE',
                'name'            => 'College of Criminal Justice Education (CCJE)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CTE',
                'name'            => 'College of Teacher Education (CTE)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CoA',
                'name'            => 'College of Accountancy (CoA)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CoN',
                'name'            => 'College of Nursing (CoN)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CAS',
                'name'            => 'College of Arts and Sciences (CAS)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CORE',
                'name'            => 'College of Operations, Resources, and Entrepreneurship (CORE)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CEnTech',
                'name'            => 'College of Engineering and Technology (CEnTech)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
            [
                'code'            => 'CIHT',
                'name'            => 'College of Innovative Hospitality and Tourism (CIHT)',
                'campus_location' => 'Main Campus',
                'office_id'       => $office?->id,
            ],
        ];

        foreach ($colleges as $dept) {
            Department::updateOrCreate(
                ['name' => $dept['name']],
                [
                    'code'            => $dept['code'],
                    'campus_location' => $dept['campus_location'],
                    'office_id'       => $dept['office_id'],
                ]
            );
        }
    }
}
