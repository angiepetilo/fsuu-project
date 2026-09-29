<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\EquipmentType;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $brandDefinitions = [
            // Projectors
            ['name' => 'EPSON', 'category_eq_name' => 'Digital Multimedia Projector', 'description' => 'Epson 3LCD Business & Classroom Projectors'],
            ['name' => 'ACER', 'category_eq_name' => 'Digital Multimedia Projector', 'description' => 'Acer DLP Multimedia & Portable Projectors'],
            ['name' => 'BENQ', 'category_eq_name' => 'Digital Multimedia Projector', 'description' => 'BenQ High Clarity Educational Projectors'],
            ['name' => 'SONY', 'category_eq_name' => 'Digital Multimedia Projector', 'description' => 'Sony High Definition AV Systems & Display Hardware'],

            // Audio & Microphones
            ['name' => 'SHURE', 'category_eq_name' => 'Wireless Handheld Microphone', 'description' => 'Shure Professional Wireless Audio & Microphones'],
            ['name' => 'SENNHEISER', 'category_eq_name' => 'Wireless Lapel Microphone', 'description' => 'Sennheiser Wireless Lavalier & Bodypack Audio'],
            ['name' => 'JBL', 'category_eq_name' => 'Portable PA Speaker System', 'description' => 'JBL EON Professional Portable PA Sound Reinforcement'],
            ['name' => 'YAMAHA', 'category_eq_name' => 'Multi-Channel Audio Mixer', 'description' => 'Yamaha MG Series Compact Live Mixers'],
            ['name' => 'BEHRINGER', 'category_eq_name' => 'Multi-Channel Audio Mixer', 'description' => 'Behringer Xenyx Low-Noise Audio Mixers'],

            // Presentation, Computer & Peripherals
            ['name' => 'LOGITECH', 'category_eq_name' => 'Wireless Presentation Clicker', 'description' => 'Logitech Spotlight & R400 Wireless Presenters'],
            ['name' => 'ASUS', 'category_eq_name' => 'Laptop / Media Presenter', 'description' => 'Asus ExpertBook Presentation Workstation Laptops'],
            ['name' => 'LENOVO', 'category_eq_name' => 'Laptop / Media Presenter', 'description' => 'Lenovo ThinkPad Reliable AV Display Laptops'],
            ['name' => 'CANON', 'category_eq_name' => 'Document Camera / Visualizer', 'description' => 'Canon High Resolution Visual Presentation Optics'],
            ['name' => 'OMNI', 'category_eq_name' => 'Heavy-Duty Extension Cord', 'description' => 'Omni Industrial Grade Surge-Protected Extension Lines'],
            ['name' => 'UGREEN', 'category_eq_name' => 'High-Definition HDMI Cable (5M/10M)', 'description' => 'Ugreen Braided 4K Ultra-HD HDMI Cables'],
        ];

        foreach ($brandDefinitions as $b) {
            $equipmentType = EquipmentType::where('eq_name', $b['category_eq_name'])->first();

            Brand::updateOrCreate(
                ['name' => strtoupper($b['name'])],
                [
                    'equipment_type_id' => $equipmentType?->id,
                    'description' => $b['description'],
                    'status' => 'active',
                ]
            );
        }
    }
}
