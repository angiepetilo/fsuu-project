<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use Illuminate\Database\Seeder;

class EquipmentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'eq_name' => 'Digital Multimedia Projector',
                'description' => 'High-lumen digital projector for classroom and AVR presentations.',
                'total_quantity' => 10,
                'available_count' => 10,
                'lifespan_years' => 5,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Tripod Projector Screen',
                'description' => 'Portable 70x70 / 84x84 inch tripod projection screen.',
                'total_quantity' => 8,
                'available_count' => 8,
                'lifespan_years' => 5,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Wireless Lapel Microphone',
                'description' => 'UHF wireless bodypack transmitter with clip-on tie microphone.',
                'total_quantity' => 6,
                'available_count' => 6,
                'lifespan_years' => 3,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Wireless Handheld Microphone',
                'description' => 'Dual channel wireless dynamic handheld vocal microphone.',
                'total_quantity' => 12,
                'available_count' => 12,
                'lifespan_years' => 3,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Portable PA Speaker System',
                'description' => 'Rechargeable active portable speaker with Bluetooth and AUX input.',
                'total_quantity' => 5,
                'available_count' => 5,
                'lifespan_years' => 5,
                'status' => 'available',
            ],
            [
                'eq_name' => 'High-Definition HDMI Cable (5M/10M)',
                'description' => 'High-speed braided gold-plated HDMI video cable.',
                'total_quantity' => 20,
                'available_count' => 20,
                'lifespan_years' => 2,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Wireless Presentation Clicker',
                'description' => '2.4GHz USB wireless slide presenter with red laser pointer.',
                'total_quantity' => 15,
                'available_count' => 15,
                'lifespan_years' => 3,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Laptop / Media Presenter',
                'description' => 'Mobile workstation laptop for multimedia event playback.',
                'total_quantity' => 4,
                'available_count' => 4,
                'lifespan_years' => 4,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Heavy-Duty Extension Cord',
                'description' => '10-meter industrial heavy duty extension cord with universal outlets.',
                'total_quantity' => 25,
                'available_count' => 25,
                'lifespan_years' => 3,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Document Camera / Visualizer',
                'description' => 'High resolution desktop document camera for live demonstrations.',
                'total_quantity' => 3,
                'available_count' => 3,
                'lifespan_years' => 4,
                'status' => 'available',
            ],
            [
                'eq_name' => 'Multi-Channel Audio Mixer',
                'description' => '4-channel / 8-channel compact audio mixing console.',
                'total_quantity' => 4,
                'available_count' => 4,
                'lifespan_years' => 5,
                'status' => 'available',
            ],
        ];

        foreach ($categories as $cat) {
            EquipmentType::updateOrCreate(
                ['eq_name' => $cat['eq_name']],
                [
                    'equipment_types_name' => $cat['eq_name'],
                    'name' => $cat['eq_name'],
                    'description' => $cat['description'],
                    'total_quantity' => $cat['total_quantity'],
                    'available_count' => $cat['available_count'],
                    'lifespan_years' => $cat['lifespan_years'],
                    'status' => $cat['status'],
                ]
            );
        }
    }
}
