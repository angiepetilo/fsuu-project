<?php

use App\Models\EquipmentType;
use App\Models\Office;
use App\Models\User;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->equipmentType = EquipmentType::create([
        'office_id' => $this->office->id,
        'name' => 'Projector',
        'total_quantity' => 2,
    ]);
    
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
        'area'       => 'equipment_borrowing',
        'action'     => 'approve',
        'granted_by' => $this->staff->id,
    ]);
});

it('rejects requests with no token', function () {
    $this->getJson('/api/avr-equipment-borrowings')
        ->assertStatus(401);
});

it('creates a borrowing with valid quantity', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-equipment-borrowings', [
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'purpose' => 'Thesis defense',
            'place_of_use' => 'AVR1',
            'used_inside_campus' => true,
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
            'items' => [
                [
                    'equipment_type_id' => $this->equipmentType->id,
                    'quantity_requested' => 1,
                ],
            ],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'pending')
        ->assertJsonPath('submitted_by', $this->staff->id);
});

it('blocks quantity exceeding availability', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-equipment-borrowings', [
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'purpose' => 'Thesis defense',
            'place_of_use' => 'AVR1',
            'used_inside_campus' => true,
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
            'items' => [
                [
                    'equipment_type_id' => $this->equipmentType->id,
                    'quantity_requested' => 3,
                ],
            ],
        ]);

    $response->assertStatus(409);
});

it('blocks external user without a venue booking', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-equipment-borrowings', [
            'requestor_name' => 'External User',
            'requestor_email' => 'ext@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'External Org',
            'requestor_identity_type' => 'external',
            'purpose' => 'Seminar',
            'place_of_use' => 'AVR1',
            'used_inside_campus' => true,
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
            'items' => [
                [
                    'equipment_type_id' => $this->equipmentType->id,
                    'quantity_requested' => 1,
                ],
            ],
        ]);

    $response->assertStatus(422);
});

it('approves a borrowing', function () {
    $create = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-equipment-borrowings', [
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'purpose' => 'Thesis defense',
            'place_of_use' => 'AVR1',
            'used_inside_campus' => true,
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
            'items' => [
                [
                    'equipment_type_id' => $this->equipmentType->id,
                    'quantity_requested' => 1,
                ],
            ],
        ]);

    $borrowingId = $create->json('id');

    $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-equipment-borrowings/{$borrowingId}/approve", ['remarks' => 'Looks good'])
        ->assertStatus(200)
        ->assertJsonPath('status', 'approved');
});

it('blocks staff from viewing another office borrowing', function () {
    $otherOffice = Office::create(['name' => 'SCO', 'code' => 'SCO', 'type' => 'sco']);
    $otherStaff = User::forceCreate([
        'office_id' => $otherOffice->id,
        'role' => 'staff',
        'name' => 'SCO Staff',
        'email' => 'scostaff@test.com',
        'password' => bcrypt('password'),
    ]);

    $create = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-equipment-borrowings', [
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'purpose' => 'Thesis defense',
            'place_of_use' => 'AVR1',
            'used_inside_campus' => true,
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
            'items' => [
                [
                    'equipment_type_id' => $this->equipmentType->id,
                    'quantity_requested' => 1,
                ],
            ],
        ]);

    $borrowingId = $create->json('id');

    $this->actingAs($otherStaff, 'sanctum')
        ->getJson("/api/avr-equipment-borrowings/{$borrowingId}")
        ->assertStatus(403);
});

it('rejects requests containing items from multiple different offices', function () {
    $scoOffice = Office::create(['name' => 'SCO', 'code' => 'SCO', 'type' => 'sco']);
    $scoEquipment = EquipmentType::create([
        'office_id' => $scoOffice->id,
        'name' => 'Camera',
        'total_quantity' => 2,
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/avr-equipment-borrowings', [
            'requestor_name' => 'Juan Dela Cruz',
            'requestor_email' => 'juan@test.com',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CS Department',
            'requestor_identity_type' => 'student',
            'purpose' => 'Thesis defense',
            'place_of_use' => 'AVR1',
            'used_inside_campus' => true,
            'contact_preference' => 'email',
            'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
            'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
            'items' => [
                [
                    'equipment_type_id' => $this->equipmentType->id, // AVR
                    'quantity_requested' => 1,
                ],
                [
                    'equipment_type_id' => $scoEquipment->id, // SCO
                    'quantity_requested' => 1,
                ]
            ],
        ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'A single request cannot contain equipment from multiple different offices.');
});

