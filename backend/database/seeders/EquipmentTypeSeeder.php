<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use Illuminate\Database\Seeder;

class EquipmentTypeSeeder extends Seeder
{
    public function run(): void
    {
        EquipmentType::firstOrCreate(
            ['eq_name' => 'LCD Projector'],
            [
                'office_id' => 1,
                'eq_type' => 'visual',
                'total_quantity' => 10,
                'available_count' => 10,
                'status' => 'available',
            ]
        );

        EquipmentType::firstOrCreate(
            ['eq_name' => 'Wireless Microphone System'],
            [
                'office_id' => 1,
                'eq_type' => 'audio',
                'total_quantity' => 8,
                'available_count' => 8,
                'status' => 'available',
            ]
        );

        EquipmentType::firstOrCreate(
            ['eq_name' => 'Portable Sound System'],
            [
                'office_id' => 2,
                'eq_type' => 'audio',
                'total_quantity' => 5,
                'available_count' => 5,
                'status' => 'available',
            ]
        );
    }
}
