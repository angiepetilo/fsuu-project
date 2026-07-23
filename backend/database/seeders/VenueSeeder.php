<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Venue;
use Illuminate\Database\Seeder;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $avr = Office::where('code', 'AVR')->first();
        $sco = Office::where('code', 'SCO')->first();

        if (! $avr || ! $sco) {
            $this->command->warn('Offices not found. Run UserSeeder first.');
            return;
        }

        $venues = [
            // AVR Venues
            [
                'office_id'      => $avr->id,
                'name'           => 'AVR 1',
                'location'       => 'FSUU Main Campus',
                'capacity'       => 120,
                'external_price' => 2000.00,
                'is_active'      => true,
            ],
            [
                'office_id'      => $avr->id,
                'name'           => 'AVR 2',
                'location'       => 'FSUU Main Campus',
                'capacity'       => 80,
                'external_price' => 1500.00,
                'is_active'      => true,
            ],
            [
                'office_id'      => $avr->id,
                'name'           => 'Hagenburg Hall',
                'location'       => 'FSUU Main Campus',
                'capacity'       => 300,
                'external_price' => 5000.00,
                'is_active'      => true,
            ],
            // SCO Venues
            [
                'office_id'      => $sco->id,
                'name'           => 'Webcast Studio (Main)',
                'location'       => 'FSUU Main Campus',
                'capacity'       => null,
                'external_price' => null,
                'is_active'      => true,
            ],
            [
                'office_id'      => $sco->id,
                'name'           => 'Webcast Studio (Morelos)',
                'location'       => 'FSUU Morelos Campus',
                'capacity'       => null,
                'external_price' => null,
                'is_active'      => true,
            ],
            [
                'office_id'      => $sco->id,
                'name'           => 'Mini Theater',
                'location'       => 'FSUU Morelos Campus',
                'capacity'       => 60,
                'external_price' => null,
                'is_active'      => true,
            ],
        ];

        foreach ($venues as $venue) {
            Venue::firstOrCreate(
                ['name' => $venue['name'], 'office_id' => $venue['office_id']],
                $venue
            );
        }

        $this->command->info('Venues seeded: ' . Venue::count() . ' total.');
    }
}
