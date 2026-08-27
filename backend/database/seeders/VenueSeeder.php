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
            $existing = Venue::withTrashed()->where('name', $v['name'])->first();
            if ($existing) {
                $existing->update([
                    'capacity'    => $v['capacity'],
                    'location'    => $v['location'],
                    'status'      => $v['status'],
                    'archived_at' => null,
                ]);
            } else {
                Venue::create([
                    'name'              => $v['name'],
                    'capacity'          => $v['capacity'],
                    'location'          => $v['location'],
                    'status'            => $v['status'],
                    'allowed_equipment' => null,
                    'avatar'            => null,
                    'archived_at'       => null,
                ]);
            }
        }
    }
}
