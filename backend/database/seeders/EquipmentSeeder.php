<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    public function run(): void
    {
        $equipmentCategories = [
            [
                'eq_name'     => 'Projector',
                'description' => 'Multimedia Projector for classroom presentations and venue events.',
            ],
            [
                'eq_name'     => 'HDMI',
                'description' => 'High-speed HDMI connection cable.',
            ],
            [
                'eq_name'     => 'Projector Screen',
                'description' => 'Heavy-duty portable projection screen.',
            ],
            [
                'eq_name'     => 'Camera',
                'description' => 'High-definition digital video and documentation camera.',
            ],
            [
                'eq_name'     => 'Microphone',
                'description' => 'Standard wired dynamic vocal microphone.',
            ],
            [
                'eq_name'     => 'Wireless Microphone',
                'description' => 'Dual-channel UHF wireless handheld microphone set.',
            ],
        ];

        foreach ($equipmentCategories as $item) {
            EquipmentType::withTrashed()->updateOrCreate(
                [
                    'eq_name' => $item['eq_name'],
                ],
                [
                    'description'     => $item['description'],
                    'avatar'          => null,
                    'total_quantity'  => 0,
                    'available_count' => 0,
                    'damaged_count'   => 0,
                    'lost_count'      => 0,
                    'released_count'  => 0,
                    'date_purchased'  => now()->toDateString(),
                    'lifespan_years'  => 5,
                    'status'          => 'available',
                    'archived_at'     => null,
                ]
            );
        }
    }
}
