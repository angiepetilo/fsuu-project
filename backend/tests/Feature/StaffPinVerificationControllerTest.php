<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use App\Models\AvrVenueBooking;
use App\Models\Venue;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->office->setPin('123456');

    $this->venue = Venue::create(['office_id' => $this->office->id, 'name' => 'AVR1', 'location' => 'FSUU Main', 'is_active' => true]);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role' => 'staff',
        'name' => 'AVR Staff',
        'email' => 'avrstaff@test.com',
        'password' => bcrypt('password'),
    ]);

    $this->venueBooking = AvrVenueBooking::forceCreate([
        'reference_code' => 'VN-12345',
        'venue_id' => $this->venue->id,
        'requestor_name' => 'Test',
        'requestor_email' => 'test@test.com',
        'requestor_contact_number' => '123',
        'requestor_program_office' => 'CS',
        'requestor_identity_type' => 'student',
        'booking_classification' => 'academic',
        'purpose' => 'Test',
        'number_of_persons' => 10,
        'title_of_reservation' => 'Test',
        'event_type' => 'academic',
        'contact_preference' => 'email',
        'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
        'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        'status' => 'approved',
    ]);
});

it('verifies staff pin and records entry', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-venue-bookings/{$this->venueBooking->id}/verify-pin", [
            'raw_pin' => '123456',
            'contact_method_verified' => 'id_card',
        ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('entry_verifications', [
        'avr_venue_booking_id' => $this->venueBooking->id,
        'verified_by' => $this->staff->id,
        'contact_method_verified' => 'id_card',
    ]);
});

it('rejects invalid pin', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-venue-bookings/{$this->venueBooking->id}/verify-pin", [
            'raw_pin' => 'wrong',
            'contact_method_verified' => 'id_card',
        ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Invalid PIN.');
});
