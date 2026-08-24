<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Venue;
use App\Models\Role;
use App\Models\User;
use App\Exceptions\VenueReservationTooSoonException;
use Illuminate\Foundation\Testing\RefreshDatabase;

class VenueLeadTimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_booking_less_than_3_days_fails(): void
    {
        $venue = Venue::create([
            'name' => 'AVR 1',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $service = app(\App\Services\VenueBookingService::class);

        $this->expectException(VenueReservationTooSoonException::class);

        $service->create([
            'venue_id'                 => $venue->id,
            'requestor_name'           => 'Test Student',
            'requestor_email'          => 'student@fsuu.edu.ph',
            'requestor_contact_number' => '09171234567',
            'purpose'                  => 'Activity',
            'date_of_usage'            => now()->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => null, // Public
        ]);
    }

    public function test_public_booking_three_days_or_more_succeeds(): void
    {
        $venue = Venue::create([
            'name' => 'AVR 2',
            'location' => 'Main Campus',
            'capacity' => 150,
            'status' => 'available',
        ]);

        $service = app(\App\Services\VenueBookingService::class);

        $booking = $service->create([
            'venue_id'                 => $venue->id,
            'requestor_name'           => 'Test Student',
            'requestor_email'          => 'student@fsuu.edu.ph',
            'requestor_contact_number' => '09171234567',
            'purpose'                  => 'Activity Ahead',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => null,
        ]);

        $this->assertNotNull($booking->id);
        $this->assertEquals('pending', $booking->status);
    }

    public function test_admin_booking_on_short_notice_succeeds(): void
    {
        $venue = Venue::create([
            'name' => 'AVR 3',
            'location' => 'Main Campus',
            'capacity' => 200,
            'status' => 'available',
        ]);

        $role = Role::create(['name' => 'admin']);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@fsuu.edu.ph',
            'password' => bcrypt('secret123'),
            'role_id' => $role->id,
        ]);

        $service = app(\App\Services\VenueBookingService::class);

        $booking = $service->create([
            'venue_id'                 => $venue->id,
            'requestor_name'           => 'Emergency Booking',
            'requestor_email'          => 'emergency@fsuu.edu.ph',
            'requestor_contact_number' => '09171234567',
            'purpose'                  => 'Urgent Faculty Meeting',
            'date_of_usage'            => now()->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => $admin->id, // Admin override
        ]);

        $this->assertNotNull($booking->id);
    }
}
