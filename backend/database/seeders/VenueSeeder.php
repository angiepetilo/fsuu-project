<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Venue;
use Illuminate\Database\Seeder;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $office = Office::first();
        if (!$office) {
            $office = Office::firstOrCreate([
                'name'     => 'AVR Office I',
                'location' => 'Main Campus',
                'slug'     => 'avr-office-i-main-campus',
            ]);
        }

        $venues = [
            [
                'name'     => 'AVR 1',
                'capacity' => 100,
                'location' => 'Main Campus, CB Building',
                'status'   => 'available',
                'avatar'   => null,
            ],
            [
                'name'     => 'AVR 2',
                'capacity' => 300,
                'location' => 'Main Campus, High School Building',
                'status'   => 'available',
                'avatar'   => null,
            ],
            [
                'name'     => 'HAGGENBURG HALL',
                'capacity' => 400,
                'location' => 'Main Campus, Gymnasium Complex',
                'status'   => 'available',
                'avatar'   => null,
            ],
        ];

        foreach ($venues as $v) {
            Venue::withTrashed()->updateOrCreate(
                [
                    'name' => $v['name'],
                ],
                [
                    'office_id'   => $office->id,
                    'capacity'    => $v['capacity'],
                    'location'    => $v['location'],
                    'status'      => $v['status'],
                    'avatar'      => null,
                    'archived_at' => null,
                ]
            );
        }
    }
}
