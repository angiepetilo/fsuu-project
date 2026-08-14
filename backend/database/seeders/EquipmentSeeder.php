<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Office;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    public function run(): void
    {
        $officeMain = Office::where('name', 'AVR Office I')->first();
        $officeMorelos = Office::where('name', 'AVR Office II')->first();

        $equipmentData = [
            // ─── AVR Office I (Main Campus) ──────────────────────────────────
            [
                'office_id'      => $officeMain?->id,
                'eq_name'        => 'Epson LCD Multimedia Projector',
                'eq_type'        => 'Audio-Visual',
                'description'    => '3500 Lumens Full HD multimedia projector for classroom and AVR events.',
                'units_count'    => 5,
                'prefix'         => 'MAIN-PRJ',
            ],
            [
                'office_id'      => $officeMain?->id,
                'eq_name'        => 'Wireless Lapel & Handheld Microphone Set',
                'eq_type'        => 'Audio',
                'description'    => 'UHF dual-channel wireless microphone system with receiver.',
                'units_count'    => 4,
                'prefix'         => 'MAIN-MIC',
            ],
            [
                'office_id'      => $officeMain?->id,
                'eq_name'        => 'Portable Powered PA Speaker System',
                'eq_type'        => 'Audio',
                'description'    => '12-inch active PA speaker with Bluetooth and XLR inputs.',
                'units_count'    => 1,
                'prefix'         => 'MAIN-SPK',
            ],
            [
                'office_id'      => $officeMain?->id,
                'eq_name'        => 'High-Speed HDMI & VGA Cable Kit',
                'eq_type'        => 'Accessories',
                'description'    => '10-meter gold-plated HDMI 2.0 and VGA display cables.',
                'units_count'    => 5,
                'prefix'         => 'MAIN-CBL',
            ],
            [
                'office_id'      => $officeMain?->id,
                'eq_name'        => 'Mobile Heavy-Duty Projection Screen',
                'eq_type'        => 'Visual',
                'description'    => '100-inch 16:9 portable pull-up projection screen.',
                'units_count'    => 0, // No stock
                'prefix'         => 'MAIN-SCR',
            ],

            // ─── AVR Office II (Morelos Campus) ──────────────────────────────
            [
                'office_id'      => $officeMorelos?->id,
                'eq_name'        => 'Smart Interactive Laser Projector',
                'eq_type'        => 'Audio-Visual',
                'description'    => 'Short-throw laser interactive display projector.',
                'units_count'    => 5,
                'prefix'         => 'MOR-PRJ',
            ],
            [
                'office_id'      => $officeMorelos?->id,
                'eq_name'        => 'UHF Dual Wireless Microphone',
                'eq_type'        => 'Audio',
                'description'    => 'Professional digital UHF wireless handheld microphones.',
                'units_count'    => 4,
                'prefix'         => 'MOR-MIC',
            ],
            [
                'office_id'      => $officeMorelos?->id,
                'eq_name'        => 'Compact Stage Monitor Speaker',
                'eq_type'        => 'Audio',
                'description'    => '10-inch active stage floor monitor and PA speaker.',
                'units_count'    => 1,
                'prefix'         => 'MOR-SPK',
            ],
            [
                'office_id'      => $officeMorelos?->id,
                'eq_name'        => 'Heavy-Duty Tripod Stand',
                'eq_type'        => 'Accessories',
                'description'    => 'Adjustable aluminum speaker and projector tripod stand.',
                'units_count'    => 4,
                'prefix'         => 'MOR-TRP',
            ],
            [
                'office_id'      => $officeMorelos?->id,
                'eq_name'        => 'Overhead Document Camera Scanner',
                'eq_type'        => 'Visual',
                'description'    => 'High-definition 4K USB document visualizer camera.',
                'units_count'    => 0, // No stock
                'prefix'         => 'MOR-DOC',
            ],
        ];

        foreach ($equipmentData as $item) {
            if (empty($item['office_id'])) continue;

            $status = $item['units_count'] > 0 ? 'available' : 'out_of_stock';

            $eqType = EquipmentType::updateOrCreate(
                [
                    'office_id' => $item['office_id'],
                    'eq_name'   => $item['eq_name'],
                ],
                [
                    'eq_type'         => $item['eq_type'],
                    'description'     => $item['description'],
                    'avatar'          => null, // No avatar or images
                    'total_quantity'  => $item['units_count'],
                    'available_count' => $item['units_count'],
                    'date_purchased'  => now()->subMonths(6)->toDateString(),
                    'lifespan_years'  => 5,
                    'status'          => $status,
                ]
            );

            // Create individual equipment units for inventory tracking
            for ($i = 1; $i <= $item['units_count']; $i++) {
                $code = sprintf('%s-%03d', $item['prefix'], $i);
                EquipmentUnit::updateOrCreate(
                    [
                        'equipment_type_id' => $eqType->id,
                        'unit_code'         => $code,
                    ],
                    [
                        'name'         => "{$item['eq_name']} Unit {$i}",
                        'purchased_at' => now()->subMonths(6)->toDateString(),
                        'eq_lifespan'  => 5,
                        'status'       => 'available',
                        'condition'    => 'good',
                        'description'  => "Unit {$i} of {$item['eq_name']}",
                    ]
                );
            }
        }
    }
}
