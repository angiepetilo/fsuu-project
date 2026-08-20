<?php

namespace Database\Seeders;

use App\Models\Office;
use Illuminate\Database\Seeder;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            [
                'name'     => 'AVR Office I',
                'location' => 'Main Campus',
                'slug'     => 'avr-office-i-main-campus',
            ],
            [
                'name'     => 'AVR Office II',
                'location' => 'Morelos Campus',
                'slug'     => 'avr-office-ii-morelos-campus',
            ],
        ];

        foreach ($offices as $off) {
            Office::firstOrCreate(
                ['name' => $off['name']],
                [
                    'location' => $off['location'],
                    'slug'     => $off['slug'],
                ]
            );
        }
    }
}
