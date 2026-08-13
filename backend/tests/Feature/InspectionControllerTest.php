<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use App\Models\Role;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $staffRole = Role::firstOrCreate(['name' => 'staff']);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role_id'   => $staffRole->id,
        'name'      => 'AVR Staff',
        'email'     => 'avrstaff@test.com',
        'password'  => bcrypt('password'),
    ]);
});

it('records an inspection', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/inspections', [
            'reference_type'  => 'avr_venue_booking',
            'reference_id'    => 1,
            'inspection_type' => 'post_event',
            'notes'           => 'Room left messy',
            'condition'       => 'damaged',
            'has_damage'      => true,
        ]);

    $response->assertStatus(200);
    
    $this->assertDatabaseHas('inspections', [
        'reference_type'  => 'avr_venue_booking',
        'reference_id'    => 1,
        'inspected_by'    => $this->staff->id,
        'inspection_type' => 'post_event',
        'condition'       => 'damaged',
        'notes'           => 'Room left messy',
    ]);
});
