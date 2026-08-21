<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    public function run(): void
    {
        $equipmentCategories = [
            [
                'eq_name'        => 'Projector',
                'eq_type'        => 'Visual',
                'description'    => 'Multimedia Projector for classroom presentations and venue events.',
                'units_count'    => 5,
                'prefix'         => 'PRJ',
            ],
            [
                'eq_name'        => 'HDMI',
                'eq_type'        => 'Accessories',
                'description'    => 'High-speed HDMI connection cable.',
                'units_count'    => 5,
                'prefix'         => 'HDMI',
            ],
            [
                'eq_name'        => 'Projector Screen',
                'eq_type'        => 'Visual',
                'description'    => 'Heavy-duty portable projection screen.',
                'units_count'    => 5,
                'prefix'         => 'SCR',
            ],
            [
                'eq_name'        => 'Camera',
                'eq_type'        => 'Visual',
                'description'    => 'High-definition digital video and documentation camera.',
                'units_count'    => 5,
                'prefix'         => 'CAM',
            ],
            [
                'eq_name'        => 'Microphone',
                'eq_type'        => 'Audio',
                'description'    => 'Standard wired dynamic vocal microphone.',
                'units_count'    => 5,
                'prefix'         => 'MIC',
            ],
            [
                'eq_name'        => 'Wireless Microphone',
                'eq_type'        => 'Audio',
                'description'    => 'Dual-channel UHF wireless handheld microphone set.',
                'units_count'    => 5,
                'prefix'         => 'WMIC',
            ],
        ];

        foreach ($equipmentCategories as $item) {
            $status = $item['units_count'] > 0 ? 'available' : 'out_of_stock';

            $eqType = EquipmentType::withTrashed()->updateOrCreate(
                [
                    'eq_name'   => $item['eq_name'],
                ],
                [
                    'eq_type'         => $item['eq_type'],
                    'description'     => $item['description'],
                    'avatar'          => null,
                    'total_quantity'  => $item['units_count'],
                    'available_count' => $item['units_count'],
                    'date_purchased'  => now()->toDateString(),
                    'lifespan_years'  => 5,
                    'status'          => $status,
                    'archived_at'     => null,
                ]
            );

            for ($i = 1; $i <= $item['units_count']; $i++) {
                $code = sprintf('%s-%03d', $item['prefix'], $i);
                EquipmentUnit::withTrashed()->updateOrCreate(
                    [
                        'unit_code' => $code,
                    ],
                    [
                        'equipment_type_id' => $eqType->id,
                        'name'              => "{$item['eq_name']} Unit {$i}",
                        'purchased_at'      => now()->toDateString(),
                        'eq_lifespan'       => 5,
                        'status'            => 'available',
                        'condition'         => 'good',
                        'description'       => "Unit {$i} of {$item['eq_name']}",
                        'archived_at'       => null,
                    ]
                );
            }
        }
    }
}
