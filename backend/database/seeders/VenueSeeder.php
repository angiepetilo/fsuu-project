<?php

namespace Database\Seeders;

use App\Models\Venue;
use Illuminate\Database\Seeder;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $venues = [
            [
                'name'     => 'AVR 1',
                'capacity' => 100,
                'location' => 'Main Campus, CB Building',
                'status'   => 'available',
            ],
            [
                'name'     => 'AVR 2',
                'capacity' => 300,
                'location' => 'Main Campus, High School Building',
                'status'   => 'available',
            ],
            [
                'name'     => 'HAGGENBURG HALL',
                'capacity' => 400,
                'location' => 'Main Campus, Gymnasium Complex',
                'status'   => 'available',
            ],
        ];

        foreach ($venues as $v) {
            Venue::withTrashed()->updateOrCreate(
                [
                    'name' => $v['name'],
                ],
                [
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
