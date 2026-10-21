<?php

namespace Tests\Feature;

use App\Models\EquipmentBorrow;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Role;
use App\Models\TrackingNumber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NotificationAccuracyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'super_admin']);
        $this->admin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@urios.edu.ph',
            'password' => bcrypt('password123'),
            'role_id' => $role->id,
        ]);
    }

    private function makeBorrow(string $ref): EquipmentBorrow
    {
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => $ref,
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'completed',
        ]);

        $borrow = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name'     => 'Alice',
            'last_name'      => 'Borrower',
            'filer_name'     => 'Alice Borrower',
            'email_address'  => 'alice@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose'        => 'Class Demo',
            'date_of_usage'  => now()->subDay()->toDateString(),
            'time_start'     => '09:00:00',
            'time_end'       => '11:00:00',
            'status'         => 'completed',
        ]);
        $tracking->update(['reservation_id' => $borrow->id]);

        return $borrow;
    }

    private function makeUnit(string $barcode, string $status): EquipmentUnit
    {
        $type = EquipmentType::firstOrCreate(
            ['name' => 'Projector'],
            ['category' => 'projector', 'is_public' => true]
        );

        return EquipmentUnit::create([
            'equipment_type_id' => $type->id,
            'barcode' => $barcode,
            'status'  => $status,
        ]);
    }

    private function makeInspection(EquipmentBorrow $borrow, array $overrides = []): int
    {
        return DB::table('inspections')->insertGetId(array_merge([
            'inspectable_type' => 'equipment_borrow',
            'inspectable_id'   => $borrow->id,
            'inspected_by'     => $this->admin->id,
            'inspection_type'  => 'post_use',
            'condition'        => 'good',
            'is_late'          => false,
            'timeliness'       => 'on_time',
            'minutes_late'     => 0,
            'inspected_at'     => now(),
            'created_at'       => now(),
            'updated_at'       => now(),
        ], $overrides));
    }

    private function fetch(): \Illuminate\Support\Collection
    {
        $res = $this->actingAs($this->admin)->getJson('/api/general/notifications');
        $res->assertStatus(200);

        return collect($res->json());
    }

    public function test_damaged_notification_names_exact_unit_and_record(): void
    {
        $borrow = $this->makeBorrow('EQ-TEST-0001');
        $this->makeUnit('PRJ-BAD', 'damaged');
        $this->makeUnit('PRJ-OK', 'available');

        $insId = $this->makeInspection($borrow, [
            'condition'       => 'damaged',
            'assigned_units'  => json_encode(['0-0' => 'PRJ-BAD', '0-1' => 'PRJ-OK']),
            'unit_conditions' => json_encode(['0-0' => 'Damaged', '0-1' => 'Good']),
        ]);

        $n = $this->fetch()->firstWhere('id', 'general-dmg-' . $insId);

        $this->assertNotNull($n);
        $this->assertSame('damaged', $n['incident_type']);
        $this->assertSame('PRJ-BAD', $n['barcode']);
        $this->assertStringNotContainsString('PRJ-OK', $n['unit_code']);
        $this->assertSame($borrow->id, $n['record_id']);
        $this->assertSame('EQ-TEST-0001', $n['ref']);
    }

    public function test_lost_notification_is_reported_with_lost_type(): void
    {
        $borrow = $this->makeBorrow('EQ-TEST-0002');
        $this->makeUnit('PRJ-LOST', 'lost');

        $insId = $this->makeInspection($borrow, [
            'condition'       => 'lost',
            'assigned_units'  => json_encode(['0-0' => 'PRJ-LOST']),
            'unit_conditions' => json_encode(['0-0' => 'Lost']),
        ]);

        $n = $this->fetch()->firstWhere('id', 'general-lost-' . $insId);

        $this->assertNotNull($n);
        $this->assertSame('lost', $n['incident_type']);
        $this->assertSame('PRJ-LOST', $n['barcode']);
    }

    public function test_late_return_alone_is_not_a_policy_violation(): void
    {
        $borrow = $this->makeBorrow('EQ-TEST-0003');

        $insId = $this->makeInspection($borrow, [
            'is_late'      => true,
            'timeliness'   => 'late',
            'minutes_late' => 45,
        ]);

        $all = $this->fetch();

        $this->assertNull($all->firstWhere('id', 'general-viol-' . $insId));
        $this->assertNull($all->firstWhere('id', 'general-dmg-' . $insId));

        $n = $all->firstWhere('id', 'general-late-' . $insId);
        $this->assertNotNull($n);
        $this->assertSame('late_return', $n['incident_type']);
    }

    public function test_genuine_policy_violation_is_reported(): void
    {
        $borrow = $this->makeBorrow('EQ-TEST-0004');

        $insId = $this->makeInspection($borrow, [
            'violation_type' => 'Unauthorized use of equipment',
        ]);

        $n = $this->fetch()->firstWhere('id', 'general-viol-' . $insId);

        $this->assertNotNull($n);
        $this->assertSame('policy_violation', $n['incident_type']);
    }

    public function test_clean_return_produces_no_incident_alert(): void
    {
        $borrow = $this->makeBorrow('EQ-TEST-0005');
        $insId = $this->makeInspection($borrow);

        $ids = $this->fetch()->pluck('id');

        foreach (['dmg', 'lost', 'viol', 'late'] as $kind) {
            $this->assertFalse($ids->contains("general-{$kind}-{$insId}"));
        }
    }

    public function test_repaired_unit_no_longer_raises_damaged_alert(): void
    {
        $borrow = $this->makeBorrow('EQ-TEST-0006');
        $this->makeUnit('PRJ-FIXED', 'available');

        $insId = $this->makeInspection($borrow, [
            'condition'       => 'damaged',
            'assigned_units'  => json_encode(['0-0' => 'PRJ-FIXED']),
            'unit_conditions' => json_encode(['0-0' => 'Damaged']),
        ]);

        $this->assertNull($this->fetch()->firstWhere('id', 'general-dmg-' . $insId));
    }

    private function makeVenueBooking(string $ref): VenueBooking
    {
        $venue = Venue::create(['name' => 'AVR Hall A', 'location' => 'Main', 'capacity' => 100, 'status' => 'available']);
        $tracking = TrackingNumber::forceCreate([
            'reference_code' => $ref, 'reservation_type' => 'venue_booking', 'reservation_id' => 1, 'status' => 'completed',
        ]);
        $booking = VenueBooking::create([
            'venue_id' => $venue->id, 'tracking_number_id' => $tracking->id, 'submission_channel' => 'online_self',
            'first_name' => 'John', 'last_name' => 'Doe', 'filer_name' => 'John Doe',
            'email_address' => 'johndoe@urios.edu.ph', 'contact_number' => '09171234567', 'classification' => 'student',
            'purpose' => 'Seminar', 'date_of_usage' => now()->subDay()->toDateString(),
            'time_start' => '10:00:00', 'time_end' => '12:00:00', 'no_of_person' => 25, 'status' => 'completed',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        return $booking;
    }

    public function test_venue_checked_violation_categories_are_counted_even_with_damage_wording(): void
    {
        $booking = $this->makeVenueBooking('TRK-AVR-T001');

        $insId = DB::table('inspections')->insertGetId([
            'inspectable_type' => 'avr_venue_booking',
            'inspectable_id'   => $booking->id,
            'inspected_by'     => $this->admin->id,
            'inspection_type'  => 'post_event',
            'condition'        => 'good',
            'is_late'          => false,
            'timeliness'       => 'on_time',
            'minutes_late'     => 0,
            'violation_type'   => 'Facility or Property Damage, Excessive Noise or Facility Policy Breach',
            'inspected_at'     => now(),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $n = $this->fetch()->firstWhere('id', 'general-viol-' . $insId);

        $this->assertNotNull($n);
        $this->assertSame('policy_violation', $n['incident_type']);
        $this->assertStringContainsString('Facility or Property Damage', $n['violation_details']);
        $this->assertStringContainsString('Excessive Noise', $n['violation_details']);
        // No hardware damaged alert: no physical unit was flagged
        $this->assertNull($this->fetch()->firstWhere('id', 'general-dmg-' . $insId));
        $this->assertSame($booking->id, $n['record_id']);
    }

    public function test_venue_late_plus_checked_violation_shows_both_alerts(): void
    {
        $booking = $this->makeVenueBooking('TRK-AVR-T002');

        $insId = DB::table('inspections')->insertGetId([
            'inspectable_type' => 'avr_venue_booking',
            'inspectable_id'   => $booking->id,
            'inspected_by'     => $this->admin->id,
            'inspection_type'  => 'post_event',
            'condition'        => 'good',
            'is_late'          => true,
            'timeliness'       => 'late',
            'minutes_late'     => 30,
            'violation_type'   => 'Late Return, Extension, Improper Cleanliness or Waste Disposal',
            'inspected_at'     => now(),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $all = $this->fetch();
        $viol = $all->firstWhere('id', 'general-viol-' . $insId);

        $this->assertNotNull($all->firstWhere('id', 'general-late-' . $insId));
        $this->assertNotNull($viol);
        $this->assertSame('Improper Cleanliness or Waste Disposal', $viol['violation_details']);
    }
}