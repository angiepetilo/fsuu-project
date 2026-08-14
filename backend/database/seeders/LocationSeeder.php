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
            ['name' => 'Main Campus', 'status' => 'active'],
            ['name' => 'Morelos Campus', 'status' => 'active'],
        ];

        foreach ($locations as $loc) {
            Location::updateOrCreate(
                ['name' => $loc['name']],
                [
                    'slug'   => Str::slug($loc['name']),
                    'status' => $loc['status'],
                ]
            );
        }
    }
}
