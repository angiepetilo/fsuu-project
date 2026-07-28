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
            ['eq_name' => 'Wireless Microphone', 'eq_type' => 'Audio'],
            ['eq_name' => 'HD Projector',         'eq_type' => 'Visual'],
            ['eq_name' => 'Webcam 4K',           'eq_type' => 'Visual'],
            ['eq_name' => 'PA Speaker System',    'eq_type' => 'Audio'],
        ];

        foreach ([$mainOffice, $morelosOffice] as $office) {
            if (!$office) continue;

            foreach ($equipments as $item) {
                $type = new EquipmentType();
                $type->forceFill([
                    'office_id' => $office->id,
                    'eq_name'   => $item['eq_name'],
                    'eq_type'   => $item['eq_type'],
                ]);
                $type->save();

                // Create 2 sample physical units for each equipment type
                for ($i = 1; $i <= 2; $i++) {
                    $unitCode = strtoupper(substr($office->slug, 5, 4)) . '-' . strtoupper(substr($item['eq_name'], 0, 3)) . '-' . sprintf('%03d', $i);

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
