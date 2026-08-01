<?php

namespace Database\Seeders;

use App\Models\Office;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            [
                'name' => 'FSUU Main Campus AVR Office',
                'location' => 'FSUU Main Campus',
            ],
            [
                'name' => 'Morelos Campus AVR Office',
                'location' => 'FSUU Morelos Campus',
            ],
        ];

        foreach ($offices as $officeData) {
            Office::firstOrCreate(
                ['slug' => Str::slug($officeData['name'])],
                [
                    'name' => $officeData['name'],
                    'location' => $officeData['location'],
                ]
            );
        }
    }
}
