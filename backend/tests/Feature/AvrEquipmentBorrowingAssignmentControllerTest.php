<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Office;
use App\Models\User;
use App\Models\TrackingNumber;

beforeEach(function () {
    \App\Models\Role::firstOrCreate(['id' => 1, 'name' => 'super_admin']);
    \App\Models\Role::firstOrCreate(['id' => 2, 'name' => 'admin']);
    $staffRole = \App\Models\Role::firstOrCreate(['id' => 3, 'name' => 'staff']);

    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->staff = User::forceCreate([
        'office_id'   => $this->office->id,
        'role_id'     => $staffRole->id,
        'name'        => 'AVR Staff',
        'email'       => 'avrstaff@test.com',
        'password'    => bcrypt('password'),
        'permissions' => ['equipment_borrowing', 'approve', 'assign_checkout'],
    ]);

    $this->type = EquipmentType::create([
        'office_id'      => $this->office->id,
        'eq_name'        => 'Projector',
        'eq_type'        => 'AV Equipment',
        'total_quantity' => 2,
    ]);

    $this->unit = EquipmentUnit::create([
        'equipment_type_id' => $this->type->id,
        'unit_code'         => 'PROJ-001',
        'name'              => 'Projector Unit 1',
        'status'            => 'available',
        'condition'         => 'Good',
    ]);

    $this->tracking = TrackingNumber::forceCreate([
        'reference_code'   => 'EQ-2026-0001',
        'status'           => 'approved',
        'reservation_type' => 'equipment_borrow',
        'reservation_id'   => 1,
    ]);

    $this->borrowing = EquipmentBorrowing::forceCreate([
        'tracking_number_id' => $this->tracking->id,
        'office_id'          => $this->office->id,
        'filer_name'         => 'Juan Dela Cruz',
        'email_address'      => 'juan@test.com',
        'date_of_usage'      => '2026-09-01',
        'time_start'         => '08:00:00',
        'time_end'           => '10:00:00',
        'purpose'            => 'Event',
        'classification'     => 'student',
        'contact_number'     => '09123456789',
        'place_of_use'       => 'inside',
        'program_office'     => 'CS',
        'submission_channel' => 'kiosk',
    ]);
});

it('assigns equipment units by barcode map', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->putJson("/api/avr-equipment-borrowings/{$this->borrowing->id}/assign-units", [
            'assigned_units' => [
                (string)$this->type->id => 'PROJ-001',
            ],
        ]);

    $response->assertStatus(200);
    
    $this->assertEquals('PROJ-001', $this->borrowing->fresh()->assigned_units[$this->type->id]);
});

it('rejects assignment if unit belongs to another office', function () {
    $otherOffice = Office::create(['name' => 'SCO', 'code' => 'SCO', 'type' => 'sco']);
    $otherType = EquipmentType::create([
        'office_id'      => $otherOffice->id,
        'eq_name'        => 'Camera',
        'eq_type'        => 'AV Equipment',
        'total_quantity' => 1,
    ]);
    $otherUnit = EquipmentUnit::create([
        'equipment_type_id' => $otherType->id,
        'unit_code'         => 'SCO-CAM-001',
        'name'              => 'SCO Camera 1',
        'status'            => 'available',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')
        ->putJson("/api/avr-equipment-borrowings/{$this->borrowing->id}/assign-units", [
            'assigned_units' => [
                (string)$this->type->id => 'SCO-CAM-001',
            ],
        ]);

    $response->assertStatus(422);
});
