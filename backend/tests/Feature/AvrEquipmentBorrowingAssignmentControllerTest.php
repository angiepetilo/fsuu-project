<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\EquipmentBorrowing;
use App\Models\EquipmentBorrowingItem;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Office;
use App\Models\User;
use App\Models\AvrVenueBooking;
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

    // Grant the staff member the permission required by AvrEquipmentBorrowingPolicy::assignUnit()
    \App\Models\StaffPermission::forceCreate([
        'staff_id'   => $this->staff->id,
        'office_id'  => $this->office->id,
        'area'       => 'equipment_borrowing',
        'action'     => 'assign_checkout',
        'granted_by' => $this->staff->id, // self-grant for test setup only
    ]);

    $this->type = EquipmentType::create([
        'office_id' => $this->office->id,
        'name' => 'Projector',
        'total_quantity' => 2,
    ]);

    $this->unit = EquipmentUnit::create([
        'equipment_type_id' => $this->type->id,
        'barcode' => 'PROJ-001',
        'unit_status' => 'available',
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

    $this->borrowing = EquipmentBorrowing::forceCreate([
        'reference_code' => 'EQ-12345',
        'avr_venue_booking_id' => $this->venueBooking->id,
        'requestor_name' => 'Test',
        'requestor_email' => 'test@test.com',
        'requestor_contact_number' => '123',
        'requestor_program_office' => 'CS',
        'requestor_identity_type' => 'student',
        'purpose' => 'Test',
        'place_of_use' => 'Campus',
        'used_inside_campus' => true,
        'contact_preference' => 'email',
        'start_datetime' => now()->addDays(5)->format('Y-m-d H:i:s'),
        'end_datetime' => now()->addDays(5)->addHours(2)->format('Y-m-d H:i:s'),
        'status' => 'approved',
    ]);

    $this->item = EquipmentBorrowingItem::create([
        'equipment_borrowing_id' => $this->borrowing->id,
        'equipment_type_id' => $this->type->id,
        'quantity_requested' => 1,
    ]);
});

it('assigns an equipment unit by barcode', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-equipment-borrowings/{$this->borrowing->id}/items/{$this->item->id}/assign", [
            'barcode' => 'PROJ-001',
        ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('equipment_borrowing_units', [
        'equipment_borrowing_item_id' => $this->item->id,
        'equipment_unit_id' => $this->unit->id,
    ]);
});

it('rejects assignment if barcode does not exist', function () {
    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/avr-equipment-borrowings/{$this->borrowing->id}/items/{$this->item->id}/assign", [
            'barcode' => 'INVALID-999',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('barcode');
});
