<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use App\Models\Role;
use App\Models\User;
use App\Models\TrackingNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CancelApprovedBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $staffUser;
    private User $superAdminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $superRole = Role::firstOrCreate(['name' => 'super_admin']);
        $this->superAdminUser = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@urios.edu.ph',
            'password' => bcrypt('password123'),
            'role_id' => $superRole->id,
        ]);

        $staffRole = Role::firstOrCreate(['name' => 'staff']);
        $this->staffUser = User::create([
            'name' => 'Staff Officer',
            'email' => 'staff@urios.edu.ph',
            'password' => bcrypt('password123'),
            'role_id' => $staffRole->id,
        ]);
    }

    public function test_staff_can_cancel_approved_venue_booking(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Hall A',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VB-APP-001',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 1,
            'status'           => 'approved',
        ]);

        $booking = VenueBooking::create([
            'venue_id' => $venue->id,
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'filer_name' => 'John Doe',
            'email_address' => 'johndoe@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Seminar',
            'date_of_usage' => now()->toDateString(),
            'time_start' => '10:00:00',
            'time_end' => '12:00:00',
            'no_of_person' => 25,
            'status' => 'approved',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/cancel", [
                'remarks' => 'Event cancelled by organizing department',
            ]);

        $res->assertStatus(200);
        $this->assertEquals('cancelled', $booking->fresh()->status);
        $this->assertEquals('cancelled', $tracking->fresh()->status);
    }

    public function test_staff_can_cancel_approved_equipment_borrowing_and_release_units(): void
    {
        $type = EquipmentType::create([
            'name' => 'Projector',
            'category' => 'projector',
            'is_public' => true,
        ]);

        $unit = EquipmentUnit::create([
            'equipment_type_id' => $type->id,
            'barcode' => 'PRJ-TEST-001',
            'status' => 'reserved',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-APP-001',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'approved',
        ]);

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Alice',
            'last_name' => 'Borrower',
            'filer_name' => 'Alice Borrower',
            'email_address' => 'alice@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Class Demo',
            'date_of_usage' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '11:00:00',
            'assigned_units' => ['projector' => 'PRJ-TEST-001'],
            'status' => 'approved',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/cancel", [
                'remarks' => 'Borrower requested cancellation',
            ]);

        $res->assertStatus(200);
        $this->assertEquals('cancelled', $borrowing->fresh()->status);
        $this->assertEquals('cancelled', $tracking->fresh()->status);
        $this->assertEquals('available', $unit->fresh()->status);
    }
}
