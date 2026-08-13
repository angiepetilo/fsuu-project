<?php

namespace Database\Seeders;

use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use Illuminate\Database\Seeder;

class EquipmentUnitSeeder extends Seeder
{
    public function run(): void
    {
        $projType = EquipmentType::where('eq_name', 'LCD Projector')->first();
        if ($projType) {
            EquipmentUnit::firstOrCreate(
                ['unit_code' => 'PROJ-001'],
                [
                    'equipment_type_id' => $projType->id,
                    'name' => 'Epson Projector HD #1',
                    'status' => 'available',
                    'condition' => 'Good',
                    'purchased_at' => '2025-01-10',
                ]
            );

            EquipmentUnit::firstOrCreate(
                ['unit_code' => 'PROJ-002'],
                [
                    'equipment_type_id' => $projType->id,
                    'name' => 'Epson Projector HD #2',
                    'status' => 'available',
                    'condition' => 'Good',
                    'purchased_at' => '2025-01-10',
                ]
            );
        }

        $micType = EquipmentType::where('eq_name', 'Wireless Microphone System')->first();
        if ($micType) {
            EquipmentUnit::firstOrCreate(
                ['unit_code' => 'MIC-001'],
                [
                    'equipment_type_id' => $micType->id,
                    'name' => 'Shure Wireless Mic #1',
                    'status' => 'available',
                    'condition' => 'Good',
                    'purchased_at' => '2025-02-01',
                ]
            );
        }
    }
}
