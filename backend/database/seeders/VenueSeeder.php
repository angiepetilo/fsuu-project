<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $officeMain = Office::where('name', 'AVR Office I')->first();
        $officeMorelos = Office::where('name', 'AVR Office II')->first();

        $venues = [
            [
                'office_id'   => $officeMain?->id,
                'name'        => 'Audio-Visual Room 1 (AVR 1)',
                'capacity'    => 120,
                'location'    => 'Main Campus, CB Building 3rd Floor',
                'description' => 'Main auditorium equipped with acoustic treatment, dual projectors, and sound system.',
                'status'      => 'active',
            ],
            [
                'office_id'   => $officeMorelos?->id,
                'name'        => 'Audio-Visual Room 2 (AVR 2)',
                'capacity'    => 80,
                'location'    => 'Morelos Campus, High School Building 2nd Floor',
                'description' => 'Morelos campus multimedia conference room with interactive laser display.',
                'status'      => 'active',
            ],
        ];

        foreach ($venues as $v) {
            if (empty($v['office_id'])) continue;

            Venue::updateOrCreate(
                [
                    'office_id' => $v['office_id'],
                    'name'      => $v['name'],
                ],
                [
                    'capacity' => $v['capacity'],
                    'location' => $v['location'],
                    'status'   => $v['status'],
                    'avatar'   => null,
                ]
            );
        }
    }
}
