<?php

namespace Database\Seeders;

use App\Models\Office;
use Illuminate\Database\Seeder;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        Office::firstOrCreate(
            ['slug' => 'fsuu-main'],
            ['name' => 'FSUU Main']
        );

        Office::firstOrCreate(
            ['slug' => 'fsuu-morelos'],
            ['name' => 'FSUU Morelos']
        );
    }
}
