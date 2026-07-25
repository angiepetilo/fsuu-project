<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\Venue;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->venue = Venue::create(['office_id' => $this->office->id, 'name' => 'AVR1', 'location' => 'FSUU Main', 'is_active' => true]);
});

it('allows booking submission', function () {
    $response = $this->postJson('/api/public/avr-venue-bookings', [
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
        ->assertJsonPath('submitted_by', null);
});

it('returns generic error when tracking a non-existent code', function () {
    $response = $this->postJson('/api/public/track', [
        'reference_code' => 'VN-999999',
    ]);

    $response->assertStatus(404)
        ->assertJsonPath('message', 'We could not find a booking matching this reference code.');
});

it('returns identical generic error for valid code but wrong email', function () {
    $create = $this->postJson('/api/public/avr-venue-bookings', [
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

    $refCode = $create->json('reference_code');

    $response = $this->postJson('/api/public/track', [
        'reference_code' => $refCode,
        'requestor_email' => 'hacker@test.com', // Wrong email
    ]);

    $response->assertStatus(404)
        ->assertJsonPath('message', 'We could not find a booking matching this reference code.');
});

it('returns booking when tracking with correct code and email', function () {
    $create = $this->postJson('/api/public/avr-venue-bookings', [
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

    $refCode = $create->json('reference_code');

    $response = $this->postJson('/api/public/track', [
        'reference_code' => $refCode,
        'requestor_email' => 'juan@test.com',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('reference_code', $refCode);
});

it('enforces rate limits on public tracking route', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/public/track', [
            'reference_code' => 'VN-999999',
            'requestor_email' => 'juan@test.com',
        ])->assertStatus(404);
    }

    $this->postJson('/api/public/track', [
        'reference_code' => 'VN-999999',
        'requestor_email' => 'juan@test.com',
    ])->assertStatus(429);
});