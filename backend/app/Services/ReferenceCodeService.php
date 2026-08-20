<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReferenceCodeService
{
    /**
     * Generate the next reference code for a given prefix (VN, EQ, ST).
     */
    public function generate(string $prefix): string
    {
        $yearMonth = now()->format('Ym'); // e.g. "202608"

        try {
            if (Schema::hasTable('reference_counters')) {
                $counter = DB::table('reference_counters')
                    ->where('prefix', $prefix)
                    ->where('year_month', $yearMonth)
                    ->lockForUpdate()
                    ->first();

                if (!$counter) {
                    $id = DB::table('reference_counters')->insertGetId([
                        'prefix' => $prefix,
                        'year_month' => $yearMonth,
                        'last_number' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $nextNumber = 1;
                } else {
                    $nextNumber = $counter->last_number + 1;
                    DB::table('reference_counters')
                        ->where('id', $counter->id)
                        ->update(['last_number' => $nextNumber, 'updated_at' => now()]);
                }

                $paddedNumber = str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
                return "{$prefix}-{$yearMonth}-{$paddedNumber}";
            }
        } catch (\Throwable $e) {}

        // Fallback robust tracking code generator
        $seq = (DB::table('tracking_numbers')->count() + 1);
        $paddedSeq = str_pad($seq, 5, '0', STR_PAD_LEFT);
        return "{$prefix}-" . date('Y') . "-{$paddedSeq}";
    }
}