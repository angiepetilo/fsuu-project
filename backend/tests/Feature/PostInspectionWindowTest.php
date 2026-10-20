<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use App\Models\Role;
use App\Models\User;
use App\Models\TrackingNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PostInspectionWindowTest extends TestCase
{
    use RefreshDatabase;

    private User $staffUser;
    private User $superAdminUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Super admin must be created first so it gets role_id=1 (isSuperAdmin() checks role_id===1)
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

    public function test_venue_post_inspection_blocked_when_more_than_30_minutes_before_end_time(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Auditorium',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VB-TEST-001',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 1,
            'status'           => 'ongoing',
        ]);

        // Event ends 2 hours from now
        $endDate = now()->toDateString();
        $endTime = now()->addHours(2)->format('H:i:s');

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
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'no_of_person' => 20,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/post-inspection");

        $res->assertStatus(422)
            ->assertJsonStructure(['message']);
        $this->assertStringContainsString('30 minutes before the scheduled end time', $res->json('message'));
    }

    public function test_venue_post_inspection_allowed_within_30_minutes_before_end_time(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Auditorium',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VB-TEST-002',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 2,
            'status'           => 'ongoing',
        ]);

        // Event ends in 15 minutes (within 30 mins window)
        $endDate = now()->toDateString();
        $endTime = now()->addMinutes(15)->format('H:i:s');

        $booking = VenueBooking::create([
            'venue_id' => $venue->id,
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'filer_name' => 'Jane Smith',
            'email_address' => 'janesmith@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Workshop',
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'no_of_person' => 20,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/post-inspection");

        $res->assertStatus(200);
        $this->assertEquals('post-inspection', $booking->fresh()->status);
    }

    public function test_super_admin_can_override_early_inspection(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Auditorium',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VB-TEST-003',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 3,
            'status'           => 'ongoing',
        ]);

        // Event ends 3 hours from now
        $endDate = now()->toDateString();
        $endTime = now()->addHours(3)->format('H:i:s');

        $booking = VenueBooking::create([
            'venue_id' => $venue->id,
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Mark',
            'last_name' => 'Super',
            'filer_name' => 'Mark Super',
            'email_address' => 'mark@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'faculty',
            'purpose' => 'Faculty Meeting',
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'no_of_person' => 20,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        $res = $this->actingAs($this->superAdminUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/post-inspection");

        $res->assertStatus(200);
        $this->assertEquals('post-inspection', $booking->fresh()->status);
    }

    public function test_equipment_borrowing_inspection_blocked_when_early(): void
    {
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-TEST-001',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'ongoing',
        ]);

        // Return time is 2 hours from now
        $endDate = now()->toDateString();
        $endTime = now()->addHours(2)->format('H:i:s');

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Alice',
            'last_name' => 'Borrower',
            'filer_name' => 'Alice Borrower',
            'email_address' => 'alice@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Class Project',
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/inspection");

        $res->assertStatus(422)
            ->assertJsonStructure(['message']);
        $this->assertStringContainsString('30 minutes before the scheduled return time', $res->json('message'));
    }

    public function test_equipment_borrowing_inspection_allowed_within_30_minutes(): void
    {
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-TEST-002',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 2,
            'status'           => 'ongoing',
        ]);

        // Return time is 10 minutes from now
        $endDate = now()->toDateString();
        $endTime = now()->addMinutes(10)->format('H:i:s');

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Bob',
            'last_name' => 'Borrower',
            'filer_name' => 'Bob Borrower',
            'email_address' => 'bob@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Class Activity',
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/inspection");

        $res->assertStatus(200);
        $this->assertEquals('inspection', $borrowing->fresh()->status);
    }

    public function test_staff_can_trigger_early_return_for_venue_booking_post_inspection(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Auditorium',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VB-TEST-EARLY',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 99,
            'status'           => 'ongoing',
        ]);

        // Event ends 4 hours from now
        $endDate = now()->toDateString();
        $endTime = now()->addHours(4)->format('H:i:s');

        $booking = VenueBooking::create([
            'venue_id' => $venue->id,
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Early',
            'last_name' => 'Returner',
            'filer_name' => 'Early Returner',
            'email_address' => 'early@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Early Finished Seminar',
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'no_of_person' => 20,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/post-inspection", [
                'early_return' => true,
            ]);

        $res->assertStatus(200);
        $this->assertEquals('post-inspection', $booking->fresh()->status);
    }

    public function test_staff_can_trigger_early_return_for_equipment_borrowing_inspection(): void
    {
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-TEST-EARLY',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 99,
            'status'           => 'ongoing',
        ]);

        // Return scheduled 3 hours from now
        $endDate = now()->toDateString();
        $endTime = now()->addHours(3)->format('H:i:s');

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Early',
            'last_name' => 'Borrower',
            'filer_name' => 'Early Borrower',
            'email_address' => 'earlyborrower@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'student',
            'purpose' => 'Project Done Early',
            'date_of_usage' => $endDate,
            'time_start' => now()->subHour()->format('H:i:s'),
            'time_end' => $endTime,
            'status' => 'ongoing',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/inspection", [
                'early_return' => true,
            ]);

        $res->assertStatus(200);
        $this->assertEquals('inspection', $borrowing->fresh()->status);
    }
}

