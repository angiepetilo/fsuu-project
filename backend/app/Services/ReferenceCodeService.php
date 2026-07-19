<?php

namespace App\Services;

use App\Models\ReferenceCounter;
use Illuminate\Support\Facades\DB;

class ReferenceCodeService
{
    /**
     * Generate the next reference code for a given prefix (VN, EQ, ST).
     *
     * IMPORTANT: This method must be called from WITHIN an existing
     * DB::transaction() — the same one used to insert the booking record.
     * It does not open its own transaction, so that the counter increment
     * and the booking insert either both succeed or both roll back together.
     */
    public function generate(string $prefix): string
    {
        $yearMonth = now()->format('ym'); // e.g. "2607"

        $counter = ReferenceCounter::where('prefix', $prefix)
            ->where('year_month', $yearMonth)
            ->lockForUpdate()
            ->first();

        if (! $counter) {
            $counter = ReferenceCounter::create([
                'prefix' => $prefix,
                'year_month' => $yearMonth,
                'last_number' => 0,
            ]);

            // Re-fetch with a lock in case another request created it
            // between our check and our create (extra safety).
            $counter = ReferenceCounter::where('prefix', $prefix)
                ->where('year_month', $yearMonth)
                ->lockForUpdate()
                ->first();
        }

        $nextNumber = $counter->last_number + 1;

        $counter->update(['last_number' => $nextNumber]);

        $paddedNumber = str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        return "{$prefix}-{$yearMonth}-{$paddedNumber}";
    }
}