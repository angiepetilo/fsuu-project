<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

use App\Models\EquipmentType;
use App\Models\Office;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Center', 'code' => 'AVR', 'type' => 'avr']);

    $this->equipmentType = EquipmentType::create([
        'office_id'      => $this->office->id,
        'eq_name'        => 'Sony Alpha A7 IV Camera',
        'eq_type'        => 'AV Equipment',
        'total_quantity' => 5,
        'available_count'=> 5,
    ]);
});

it('allows public student borrowing submission', function () {
    $response = $this->postJson('/api/public/avr-equipment-borrowings', [
        'requestor_name'           => 'Juan Dela Cruz',
        'requestor_email'          => 'juan@gmail.com',
        'requestor_contact_number' => '09123456789',
        'requestor_program_office' => 'CITE',
        'requestor_identity_type'   => 'student',
        'purpose'                  => 'Class Presentation',
        'place_of_use'             => 'Main Building Room 101',
        'used_inside_campus'       => true,
        'contact_preference'       => 'email',
        'start_datetime'           => now()->addDay()->format('Y-m-d 08:00:00'),
        'end_datetime'             => now()->addDay()->format('Y-m-d 17:00:00'),
        'items'                    => [
            [
                'equipment_type_id'  => $this->equipmentType->id,
                'quantity_requested' => 1,
            ],
        ],
    ]);

    $response->assertStatus(201);
    $response->assertJsonStructure(['id']);
});

it('allows standalone external user borrowing submission', function () {
    $response = $this->postJson('/api/public/avr-equipment-borrowings', [
        'requestor_name'           => 'Maria Santos',
        'requestor_email'          => 'maria.external@gmail.com',
        'requestor_contact_number' => '09987654321',
        'requestor_program_office' => 'Guest Partner',
        'requestor_identity_type'   => 'external',
        'purpose'                  => 'Community Workshop',
        'place_of_use'             => 'Audio Visual Room 1',
        'used_inside_campus'       => true,
        'contact_preference'       => 'email',
        'start_datetime'           => now()->addDay()->format('Y-m-d 09:00:00'),
        'end_datetime'             => now()->addDay()->format('Y-m-d 16:00:00'),
        'items'                    => [
            [
                'equipment_type_id'  => $this->equipmentType->id,
                'quantity_requested' => 1,
            ],
        ],
    ]);

    $response->assertStatus(201);
    $response->assertJsonStructure(['id']);
});

it('allows borrowing multiple equipment items across AVR office branches', function () {
    $office2 = Office::create(['name' => 'AVR Branch 2', 'code' => 'AVR2', 'type' => 'avr']);
    $equipmentType2 = EquipmentType::create([
        'office_id'      => $office2->id,
        'eq_name'        => 'Epson Projector EB-X06',
        'eq_type'        => 'AV Equipment',
        'total_quantity' => 3,
        'available_count'=> 3,
    ]);

    $response = $this->postJson('/api/public/avr-equipment-borrowings', [
        'requestor_name'           => 'Juvin Elasco',
        'requestor_email'          => 'kelesteangie@gmail.com',
        'requestor_contact_number' => '09876523456',
        'requestor_program_office' => 'BAP',
        'requestor_identity_type'   => 'student',
        'purpose'                  => 'class',
        'place_of_use'             => 'gym',
        'used_inside_campus'       => true,
        'contact_preference'       => 'email',
        'start_datetime'           => now()->addDay()->format('Y-m-d 08:00:00'),
        'end_datetime'             => now()->addDay()->format('Y-m-d 17:00:00'),
        'items'                    => [
            ['equipment_type_id' => $this->equipmentType->id, 'quantity_requested' => 1],
            ['equipment_type_id' => $equipmentType2->id, 'quantity_requested' => 1],
        ],
    ]);

    $response->assertStatus(201);
});
