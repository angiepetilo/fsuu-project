<?php

namespace Tests\Unit;

use Tests\TestCase;

class EquipmentAvailabilityCalculationTest extends TestCase
{
    public function test_available_stock_deducts_damaged_and_lost_units(): void
    {
        $totalRegistered = 10;
        $released = 2;
        $damaged = 1;
        $lost = 1;
        $bundled = 2;

        // Domain calculation:
        // Present on shelf = Total - Released - Damaged - Lost
        $present = max(0, $totalRegistered - $released - $damaged - $lost);
        $this->assertEquals(6, $present);

        // Standalone available = Present - Bundled built-in child units
        $available = max(0, $present - $bundled);
        $this->assertEquals(4, $available);
    }

    public function test_bundled_units_never_exceed_present_stock(): void
    {
        $totalRegistered = 3;
        $released = 3;
        $damaged = 0;
        $lost = 0;
        $bundled = 1;

        $present = max(0, $totalRegistered - $released - $damaged - $lost);
        $this->assertEquals(0, $present);

        $available = max(0, $present - $bundled);
        $this->assertEquals(0, $available, 'Available stock must floor at 0 and not become negative');
    }

    public function test_condition_damage_status_normalization(): void
    {
        $nonOperationalStatuses = ['damaged', 'lost', 'decommissioned', 'maintenance'];
        $nonOperationalConditions = ['damaged', 'lost', 'under repair', 'under_repair'];

        $testUnitA = ['status' => 'Damaged', 'condition' => 'good'];
        $testUnitB = ['status' => 'available', 'condition' => 'Under Repair'];
        $testUnitC = ['status' => 'Available', 'condition' => 'Good'];

        $isOperational = function (array $unit) use ($nonOperationalStatuses, $nonOperationalConditions): bool {
            $st = strtolower($unit['status'] ?? 'available');
            $cd = strtolower($unit['condition'] ?? 'good');
            return !in_array($st, $nonOperationalStatuses, true) && !in_array($cd, $nonOperationalConditions, true);
        };

        $this->assertFalse($isOperational($testUnitA));
        $this->assertFalse($isOperational($testUnitB));
        $this->assertTrue($isOperational($testUnitC));
    }
}
