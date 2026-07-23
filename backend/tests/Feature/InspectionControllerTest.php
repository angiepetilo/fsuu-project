<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role' => 'staff',
        'name' => 'AVR Staff',
        'email' => 'avrstaff@test.com',
        'password' => bcrypt('password'),
    ]);
});

it('records an inspection', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/inspections', [
            'reference_type' => 'avr_venue_booking',
            'reference_id' => 1,
            'inspection_type' => 'post_use',
            'condition_notes' => 'Room left messy',
            'has_damage' => true,
            'damage_charge_amount' => 500.00,
        ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('inspections', [
        'reference_type' => 'avr_venue_booking',
        'reference_id' => 1,
        'inspected_by' => $this->staff->id,
        'inspection_type' => 'post_use',
        'condition_notes' => 'Room left messy',
        'has_damage' => true,
        'damage_charge_amount' => 500.00,
    ]);
});
