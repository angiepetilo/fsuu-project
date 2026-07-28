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
            $mainVenues = ['AVR1', 'AVR2', 'Haggenburg'];
            foreach ($mainVenues as $vName) {
                Venue::firstOrCreate(
                    ['office_id' => $mainOffice->id, 'name' => $vName],
                    ['status' => 'available']
                );
            }
        }

        if ($morelosOffice) {
            $morelosVenues = ['Webcast Studio', 'Mini Theater'];
            foreach ($morelosVenues as $vName) {
                Venue::firstOrCreate(
                    ['office_id' => $morelosOffice->id, 'name' => $vName],
                    ['status' => 'available']
                );
            }
        }
    }
}
