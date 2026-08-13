<?php

namespace Database\Seeders;

use App\Models\Venue;
use Illuminate\Database\Seeder;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        Venue::firstOrCreate(
            ['name' => 'Main Audio Visual Room'],
            [
                'office_id' => 1,
                'location' => 'Main Campus - 3rd Floor Science Building',
                'capacity' => 150,
                'status' => 'available',
            ]
        );

        Venue::firstOrCreate(
            ['name' => 'Mini Theater AVR'],
            [
                'office_id' => 1,
                'location' => 'Main Campus - Arts Building',
                'capacity' => 80,
                'status' => 'available',
            ]
        );

        Venue::firstOrCreate(
            ['name' => 'Morelos AVR Hall'],
            [
                'office_id' => 2,
                'location' => 'Morelos Campus - 2nd Floor Library',
                'capacity' => 100,
                'status' => 'available',
            ]
        );
    }
}
