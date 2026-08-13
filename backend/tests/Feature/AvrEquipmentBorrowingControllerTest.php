<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

use App\Models\EquipmentType;
use App\Models\Office;
use App\Models\User;
use App\Models\Role;

beforeEach(function () {
    \App\Models\Role::firstOrCreate(['id' => 1, 'name' => 'super_admin']);
    \App\Models\Role::firstOrCreate(['id' => 2, 'name' => 'admin']);
    $staffRole = \App\Models\Role::firstOrCreate(['id' => 3, 'name' => 'staff']);

    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->equipmentType = EquipmentType::create([
        'office_id'      => $this->office->id,
        'eq_name'        => 'Projector',
        'eq_type'        => 'AV Equipment',
        'total_quantity' => 2,
    ]);
    
    $this->staff = User::forceCreate([
        'office_id'   => $this->office->id,
        'role_id'     => $staffRole->id,
        'name'        => 'AVR Staff',
        'email'       => 'avrstaff@test.com',
        'password'    => bcrypt('password'),
        'permissions' => ['equipment_borrowing', 'approve', 'assign'],
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
                    'quantity_requested' => 2,
                ],
            ],
        ]);

    $response->assertStatus(201);
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

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-equipment-borrowings/{$borrowingId}/approve", ['remarks' => 'Looks good']);

    $response->assertStatus(200);
});

it('blocks staff from viewing another office borrowing', function () {
    $otherOffice = Office::create(['name' => 'SCO', 'code' => 'SCO', 'type' => 'sco']);
    $otherStaff = User::forceCreate([
        'office_id' => $otherOffice->id,
        'role_id'   => Role::where('id', 3)->value('id') ?? 3,
        'name'      => 'SCO Staff',
        'email'     => 'scostaff@test.com',
        'password'  => bcrypt('password'),
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
