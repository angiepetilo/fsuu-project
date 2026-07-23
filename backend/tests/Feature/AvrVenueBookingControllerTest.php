<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use App\Models\Venue;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->venue = Venue::create(['office_id' => $this->office->id, 'name' => 'AVR1', 'location' => 'FSUU Main', 'is_active' => true]);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role'      => 'staff',
        'name'      => 'AVR Staff',
        'email'     => 'avrstaff@test.com',
        'password'  => bcrypt('password'),
    ]);

    \App\Models\StaffPermission::forceCreate([
        'staff_id'   => $this->staff->id,
        'office_id'  => $this->office->id,
        'area'       => 'venue_booking',
        'action'     => 'approve',
        'granted_by' => $this->staff->id,
    ]);
});

it('rejects requests with no token', function () {
    $this->getJson('/api/avr-venue-bookings')
        ->assertStatus(401);
});

it('creates a booking with a valid token', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-venue-bookings', [
            'venue_id' => $this->venue->id,
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'booking_classification' => 'academic',
            'purpose' => 'Thesis defense',
            'number_of_persons' => 10,
            'title_of_reservation' => 'Thesis Defense',
            'event_type' => 'academic',
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'pending')
        ->assertJsonPath('submitted_by', $this->staff->id);

    expect($response->json('reference_code'))->toStartWith('VN-');
});

it('approves a booking', function () {
    $create = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-venue-bookings', [
            'venue_id' => $this->venue->id,
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'booking_classification' => 'academic',
            'purpose' => 'Thesis defense',
            'number_of_persons' => 10,
            'title_of_reservation' => 'Thesis Defense',
            'event_type' => 'academic',
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        ]);

    $bookingId = $create->json('id');

    $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-venue-bookings/{$bookingId}/approve", ['remarks' => 'Looks good'])
        ->assertStatus(200)
        ->assertJsonPath('status', 'approved');
});

it('blocks staff from viewing another office\'s booking', function () {
    $otherOffice = Office::create(['name' => 'SCO', 'code' => 'SCO', 'type' => 'sco']);
    $otherStaff = User::forceCreate([
        'office_id' => $otherOffice->id,
        'role' => 'staff',
        'name' => 'SCO Staff',
        'email' => 'scostaff@test.com',
        'password' => bcrypt('password'),
    ]);

    $create = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-venue-bookings', [
            'venue_id' => $this->venue->id,
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'booking_classification' => 'academic',
            'purpose' => 'Thesis defense',
            'number_of_persons' => 10,
            'title_of_reservation' => 'Thesis Defense',
            'event_type' => 'academic',
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        ]);

    $bookingId = $create->json('id');

    $this->actingAs($otherStaff, 'sanctum')
        ->getJson("/api/avr-venue-bookings/{$bookingId}")
        ->assertStatus(403);
});