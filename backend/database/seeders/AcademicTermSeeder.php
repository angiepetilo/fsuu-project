<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AcademicTermSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('academic_terms')) {
            return;
        }

        if (DB::table('academic_terms')->count() === 0) {
            DB::table('academic_terms')->insert([
                'id'            => 1,
                'name'          => '1st Semester AY 2026-2027',
                'academic_year' => '2026-2027',
                'semester'      => '1st Semester',
                'start_date'    => '2026-08-01',
                'end_date'      => '2026-12-31',
                'is_active'     => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }
    }
}
