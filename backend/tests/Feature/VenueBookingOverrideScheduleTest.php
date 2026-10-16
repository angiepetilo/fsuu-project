<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\Role;
use App\Models\User;
use App\Models\TrackingNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;

class VenueBookingOverrideScheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Venue $originalVenue;
    private Venue $targetVenue;

    protected function setUp(): void
    {
        parent::setUp();

        $superRole = Role::firstOrCreate(['name' => 'super_admin']);
        $this->superAdmin = User::create([
            'name'     => 'Super Admin',
            'email'    => 'superadmin_override@urios.edu.ph',
            'password' => bcrypt('password123'),
            'role_id'  => $superRole->id,
        ]);

        $this->originalVenue = Venue::create([
            'name'     => 'AVR Hall 1',
            'location' => 'Main Building',
            'capacity' => 100,
            'status'   => 'available',
        ]);

        $this->targetVenue = Venue::create([
            'name'     => 'AVR Hall 2',
            'location' => 'Annex Building',
            'capacity' => 150,
            'status'   => 'available',
        ]);
    }

    public function test_super_admin_can_override_venue_and_schedule(): void
    {
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'TRK-AVR-OVR1',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 1,
            'status'           => 'approved',
        ]);

        $booking = VenueBooking::create([
            'tracking_number_id'   => $tracking->id,
            'venue_id'             => $this->originalVenue->id,
            'filer_name'           => 'John Requestor',
            'email_address'        => 'john@urios.edu.ph',
            'contact_number'       => '09123456789',
            'program_office'       => 'CITE',
            'classification'       => 'student',
            'no_of_person'         => 50,
            'purpose'              => 'Original Seminar',
            'date_of_usage'        => '2026-10-20',
            'reservation_end_date' => '2026-10-20',
            'time_start'           => '08:00:00',
            'time_end'             => '12:00:00',
            'equipment_notes'      => 'Wireless Mic (Qty: 1) | Equipment-Needed: High acoustic clarity required',
            'status'               => 'approved',
            'submission_channel'   => 'online',
        ]);

        $overridePayload = [
            'venue_id'             => $this->targetVenue->id,
            'date_of_usage'        => '2026-10-25',
            'reservation_end_date' => '2026-10-26',
            'time_start'           => '13:00',
            'time_end'             => '17:30',
            'remarks'              => 'Super Admin schedule override due to university convocation',
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/avr-venue-bookings/{$booking->id}/override", $overridePayload);

        $response->assertStatus(200);

        $booking->refresh();
        $this->assertEquals($this->targetVenue->id, $booking->venue_id);
        $this->assertEquals('2026-10-25', $booking->date_of_usage->format('Y-m-d'));
        $this->assertEquals('2026-10-26', $booking->reservation_end_date->format('Y-m-d'));
        $this->assertEquals('13:00:00', $booking->time_start);
        $this->assertEquals('17:30:00', $booking->time_end);
    }
}
