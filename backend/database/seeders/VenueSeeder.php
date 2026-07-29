<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Venue;
use Illuminate\Database\Seeder;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $mainOffice = Office::where('slug', 'fsuu-main')->first();
        $morelosOffice = Office::where('slug', 'fsuu-morelos')->first();

        if ($mainOffice) {
            $mainVenues = [
                ['name' => 'AVR 1',           'location' => 'FSUU Main Campus',    'capacity' => 100],
                ['name' => 'AVR 2',           'location' => 'FSUU Main Campus',    'capacity' => 100],
                ['name' => 'Haggenburg Hall', 'location' => 'FSUU Main Campus',    'capacity' => 300],
            ];
            foreach ($mainVenues as $v) {
                Venue::firstOrCreate(
                    ['office_id' => $mainOffice->id, 'name' => $v['name']],
                    [
                        'location' => $v['location'],
                        'capacity' => $v['capacity'],
                        'status'   => 'available',
                    ]
                );
            }
        }

        if ($morelosOffice) {
            $morelosVenues = [
                ['name' => 'Webcast Studio', 'location' => 'FSUU Morelos Campus', 'capacity' => 40],
                ['name' => 'Mini Theater',   'location' => 'FSUU Morelos Campus', 'capacity' => 150],
            ];
            foreach ($morelosVenues as $v) {
                Venue::firstOrCreate(
                    ['office_id' => $morelosOffice->id, 'name' => $v['name']],
                    [
                        'location' => $v['location'],
                        'capacity' => $v['capacity'],
                        'status'   => 'available',
                    ]
                );
            }
        }
    }
}
