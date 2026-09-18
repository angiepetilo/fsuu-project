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
                    DB::table('reference_counters')->insert([
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
                $candidate = "{$prefix}-{$yearMonth}-{$paddedNumber}";
                if (!DB::table('tracking_numbers')->where('reference_code', $candidate)->exists()) {
                    return $candidate;
                }
            }
        } catch (\Throwable $e) {}

        // Fallback robust tracking code generator (guaranteed unique)
        do {
            $seq = (DB::table('tracking_numbers')->count() + 1);
            $paddedSeq = str_pad($seq, 5, '0', STR_PAD_LEFT);
            $candidate = "{$prefix}-" . date('Y') . "-{$paddedSeq}";
            if (DB::table('tracking_numbers')->where('reference_code', $candidate)->exists()) {
                $candidate = "{$prefix}-" . date('Y') . "-" . rand(10000, 99999);
            }
        } while (DB::table('tracking_numbers')->where('reference_code', $candidate)->exists());

        return $candidate;
    }
}