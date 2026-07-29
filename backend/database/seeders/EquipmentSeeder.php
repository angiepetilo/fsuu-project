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
        $mainOffice    = Office::where('slug', 'fsuu-main')->first();
        $morelosOffice = Office::where('slug', 'fsuu-morelos')->first();

        $equipments = [
            ['eq_name' => 'Projector',           'eq_type' => 'Visual'],
            ['eq_name' => 'Projector Screen',    'eq_type' => 'Visual'],
            ['eq_name' => 'Camera',              'eq_type' => 'Visual'],
            ['eq_name' => 'Wireless Microphone', 'eq_type' => 'Audio'],
            ['eq_name' => 'Sound System',        'eq_type' => 'Audio'],
            ['eq_name' => 'Extension Cord',      'eq_type' => 'Electrical'],
            ['eq_name' => 'Broadcast Camera',    'eq_type' => 'Video'],
            ['eq_name' => 'Lapel Mic',           'eq_type' => 'Audio'],
        ];

        foreach ([$mainOffice, $morelosOffice] as $office) {
            if (!$office) continue;

            foreach ($equipments as $item) {
                $type = EquipmentType::firstOrCreate(
                    [
                        'office_id' => $office->id,
                        'eq_name'   => $item['eq_name'],
                    ],
                    [
                        'eq_type'   => $item['eq_type'],
                    ]
                );

                // Create 2 sample physical units for each equipment type if not existing
                if ($type->wasRecentlyCreated) {
                    for ($i = 1; $i <= 2; $i++) {
                        $unitCode = strtoupper(substr($office->slug, 5, 4)) . '-EQ' . $type->id . '-' . sprintf('%03d', $i);

                        $unit = new EquipmentUnit();
                        $unit->forceFill([
                            'equipment_type_id' => $type->id,
                            'unit_code'         => $unitCode,
                            'purchased_at'      => now()->subMonths(6)->toDateString(),
                            'eq_lifespan'       => 36, // 36 months
                            'status'            => 'available',
                        ]);
                        $unit->save();
                    }
                }
            }
        }
    }
}
