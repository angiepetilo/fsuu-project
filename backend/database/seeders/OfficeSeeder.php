<?php

namespace Database\Seeders;

use App\Models\Office;
use Illuminate\Database\Seeder;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        Office::firstOrCreate(
            ['id' => 1],
            [
                'name' => 'Main Campus AVR',
                'slug' => 'main-campus-avr',
                'location' => 'Main Campus',
            ]
        );

        Office::firstOrCreate(
            ['id' => 2],
            [
                'name' => 'Morelos Campus AVR',
                'slug' => 'morelos-campus-avr',
                'location' => 'Morelos Campus',
            ]
        );
    }
}
