<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use App\Models\Venue;

beforeEach(function () {
    $this->office = Office::create(['name' => 'SCO Studio', 'code' => 'SCO-S', 'type' => 'sco']);
    $this->venue = Venue::create(['office_id' => $this->office->id, 'name' => 'Studio 1', 'location' => 'FSUU Main', 'is_active' => true]);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role'      => 'staff',
        'name'      => 'SCO Staff',
        'email'     => 'scostaff@test.com',
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
    $this->getJson('/api/sco-studio-reservations')
        ->assertStatus(401);
});

it('creates a reservation with a valid token', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/sco-studio-reservations', [
            'venue_id' => $this->venue->id,
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'booking_classification' => 'academic',
            'purpose' => 'Photo shoot',
            'number_of_persons' => 5,
            'title_of_reservation' => 'Graduation Shoot',
            'event_type' => 'academic',
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'pending')
        ->assertJsonPath('submitted_by', $this->staff->id);

    expect($response->json('reference_code'))->toStartWith('ST-');
});

it('approves a reservation', function () {
    $create = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/sco-studio-reservations', [
            'venue_id' => $this->venue->id,
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'booking_classification' => 'academic',
            'purpose' => 'Photo shoot',
            'number_of_persons' => 5,
            'title_of_reservation' => 'Graduation Shoot',
            'event_type' => 'academic',
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        ]);

    $reservationId = $create->json('id');

    $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/sco-studio-reservations/{$reservationId}/approve", ['remarks' => 'Looks good'])
        ->assertStatus(200)
        ->assertJsonPath('status', 'approved');
});

it('blocks staff from viewing another office\'s reservation', function () {
    $otherOffice = Office::create(['name' => 'AVR', 'code' => 'AVR', 'type' => 'avr']);
    $otherStaff = User::forceCreate([
        'office_id' => $otherOffice->id,
        'role' => 'staff',
        'name' => 'AVR Staff',
        'email' => 'avrstaff@test.com',
        'password' => bcrypt('password'),
    ]);

    $create = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/sco-studio-reservations', [
            'venue_id' => $this->venue->id,
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'booking_classification' => 'academic',
            'purpose' => 'Photo shoot',
            'number_of_persons' => 5,
            'title_of_reservation' => 'Graduation Shoot',
            'event_type' => 'academic',
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        ]);

    $reservationId = $create->json('id');

    $this->actingAs($otherStaff, 'sanctum')
        ->getJson("/api/sco-studio-reservations/{$reservationId}")
        ->assertStatus(403);
});
