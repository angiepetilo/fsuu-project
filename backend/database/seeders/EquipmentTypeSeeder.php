<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use App\Models\Office;
use Illuminate\Database\Seeder;

class EquipmentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $avr = Office::where('code', 'AVR')->first();
        $sco = Office::where('code', 'SCO')->first();

        if (! $avr || ! $sco) {
            $this->command->warn('Offices not found. Run UserSeeder first.');
            return;
        }

        $equipments = [
            // AVR Equipment
            [
                'office_id'      => $avr->id,
                'name'           => 'Projector',
                'description'    => 'Standard projector unit.',
                'total_quantity' => 10,
                'is_active'      => true,
            ],
            [
                'office_id'      => $avr->id,
                'name'           => 'Sound System',
                'description'    => 'Portable sound system.',
                'total_quantity' => 5,
                'is_active'      => true,
            ],
            [
                'office_id'      => $avr->id,
                'name'           => 'Microphone',
                'description'    => 'Wireless or wired microphone.',
                'total_quantity' => 15,
                'is_active'      => true,
            ],
            [
                'office_id'      => $avr->id,
                'name'           => 'Extension Cord',
                'description'    => 'Heavy-duty extension cord.',
                'total_quantity' => 20,
                'is_active'      => true,
            ],
            [
                'office_id'      => $avr->id,
                'name'           => 'Camera',
                'description'    => 'Video recording camera.',
                'total_quantity' => 3,
                'is_active'      => true,
            ],
            // SCO Equipment
            [
                'office_id'      => $sco->id,
                'name'           => 'Broadcast Camera',
                'description'    => 'Professional broadcast camera.',
                'total_quantity' => 2,
                'is_active'      => true,
            ],
            [
                'office_id'      => $sco->id,
                'name'           => 'Lapel Mic',
                'description'    => 'Wireless lapel microphone.',
                'total_quantity' => 4,
                'is_active'      => true,
            ],
        ];

        foreach ($equipments as $equipment) {
            EquipmentType::firstOrCreate(
                ['name' => $equipment['name'], 'office_id' => $equipment['office_id']],
                $equipment
            );
        }

        $this->command->info('Equipment types seeded: ' . EquipmentType::count() . ' total.');
    }
}
