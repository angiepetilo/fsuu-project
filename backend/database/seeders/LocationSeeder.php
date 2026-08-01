<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            'FSUU Main Campus',
            'FSUU Morelos Campus',
        ];

        foreach ($locations as $locName) {
            Location::firstOrCreate(
                ['slug' => Str::slug($locName)],
                [
                    'name'   => $locName,
                    'status' => 'active',
                ]
            );
        }
    }
}
