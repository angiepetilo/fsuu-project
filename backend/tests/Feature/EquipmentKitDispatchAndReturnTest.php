<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use App\Models\Role;
use App\Models\User;
use App\Models\TrackingNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EquipmentKitDispatchAndReturnTest extends TestCase
{
    use RefreshDatabase;

    private User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();

        $staffRole = Role::firstOrCreate(['name' => 'staff']);
        $this->staffUser = User::create([
            'name' => 'Staff Officer',
            'email' => 'staff@urios.edu.ph',
            'password' => bcrypt('password123'),
            'role_id' => $staffRole->id,
        ]);
    }

    public function test_dispatch_of_parent_kit_automatically_transitions_tied_child_accessories_to_released(): void
    {
        $projectorType = EquipmentType::create([
            'name' => 'Projector',
            'category' => 'projector',
            'is_public' => true,
        ]);
        $hdmiType = EquipmentType::create([
            'name' => 'HDMI Cable',
            'category' => 'cable',
            'is_public' => false,
        ]);
        $cordType = EquipmentType::create([
            'name' => 'Power Cord',
            'category' => 'cord',
            'is_public' => false,
        ]);

        $child1 = EquipmentUnit::create([
            'equipment_type_id' => $hdmiType->id,
            'barcode' => 'HDMI-KIT-01',
            'status' => 'built-in',
            'condition' => 'Good',
        ]);
        $child2 = EquipmentUnit::create([
            'equipment_type_id' => $cordType->id,
            'barcode' => 'CORD-KIT-01',
            'status' => 'built-in',
            'condition' => 'Good',
        ]);

        $parent = EquipmentUnit::create([
            'equipment_type_id' => $projectorType->id,
            'barcode' => 'PRJ-KIT-01',
            'status' => 'available',
            'condition' => 'Good',
            'built_in_units' => [(string)$child1->id, (string)$child2->id],
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-DISP-001',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'approved',
        ]);

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'filer_name' => 'Maria Santos',
            'email_address' => 'maria@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'faculty',
            'purpose' => 'Lecture',
            'date_of_usage' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'assigned_units' => ['projector' => 'PRJ-KIT-01'],
            'status' => 'approved',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        // Dispatch (mark ongoing)
        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/ongoing");

        $res->assertStatus(200);

        // Verify parent is released
        $this->assertEquals('released', $parent->fresh()->status);
        // Verify child accessories are automatically transitioned to released!
        $this->assertEquals('released', $child1->fresh()->status);
        $this->assertEquals('released', $child2->fresh()->status);
    }

    public function test_return_of_healthy_kit_reverts_parent_to_available_and_accessories_to_built_in(): void
    {
        $projectorType = EquipmentType::create(['name' => 'Projector', 'category' => 'projector']);
        $hdmiType = EquipmentType::create(['name' => 'HDMI Cable', 'category' => 'cable']);

        $child = EquipmentUnit::create([
            'equipment_type_id' => $hdmiType->id,
            'barcode' => 'HDMI-RET-01',
            'status' => 'released',
            'condition' => 'Good',
        ]);
        $parent = EquipmentUnit::create([
            'equipment_type_id' => $projectorType->id,
            'barcode' => 'PRJ-RET-01',
            'status' => 'released',
            'condition' => 'Good',
            'built_in_units' => [(string)$child->id],
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-RET-001',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'on-going',
        ]);

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'filer_name' => 'Maria Santos',
            'email_address' => 'maria@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'faculty',
            'purpose' => 'Lecture',
            'date_of_usage' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'assigned_units' => ['projector' => 'PRJ-RET-01'],
            'status' => 'on-going',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        // Complete return with condition = 'good'
        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/complete", [
                'condition' => 'good',
            ]);

        $res->assertStatus(200);

        // Parent should be available
        $this->assertEquals('available', $parent->fresh()->status);
        // Tied child accessory should be reverted to built-in
        $this->assertEquals('built-in', $child->fresh()->status);
    }

    public function test_return_with_damaged_child_accessory_blocks_kit_without_damaging_healthy_units(): void
    {
        $projectorType = EquipmentType::create(['name' => 'Projector', 'category' => 'projector']);
        $hdmiType = EquipmentType::create(['name' => 'HDMI Cable', 'category' => 'cable']);
        $cordType = EquipmentType::create(['name' => 'Power Cord', 'category' => 'cord']);

        $child1 = EquipmentUnit::create([
            'equipment_type_id' => $hdmiType->id,
            'barcode' => 'HDMI-DMG-01',
            'status' => 'released',
            'condition' => 'Good',
        ]);
        $child2 = EquipmentUnit::create([
            'equipment_type_id' => $cordType->id,
            'barcode' => 'CORD-DMG-01',
            'status' => 'released',
            'condition' => 'Good',
        ]);
        $parent = EquipmentUnit::create([
            'equipment_type_id' => $projectorType->id,
            'barcode' => 'PRJ-DMG-01',
            'status' => 'released',
            'condition' => 'Good',
            'built_in_units' => [(string)$child1->id, (string)$child2->id],
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-DMG-001',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'on-going',
        ]);

        $borrowing = EquipmentBorrow::create([
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'filer_name' => 'Maria Santos',
            'email_address' => 'maria@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'faculty',
            'purpose' => 'Lecture',
            'date_of_usage' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'assigned_units' => ['projector' => 'PRJ-DMG-01'],
            'status' => 'on-going',
        ]);
        $tracking->update(['reservation_id' => $borrowing->id]);

        // Complete return with child1 (HDMI) marked Damaged
        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-equipment-borrowings/{$borrowing->id}/complete", [
                'condition' => 'damaged',
                'unit_conditions' => [
                    'HDMI-DMG-01' => 'Damaged',
                    'CORD-DMG-01' => 'Good',
                    'PRJ-DMG-01'  => 'Good',
                ],
            ]);

        $res->assertStatus(200);

        // Child 1 is flagged Damaged and unavailable
        $freshChild1 = $child1->fresh();
        $this->assertEquals('Damaged', $freshChild1->condition);
        $this->assertEquals('unavailable', $freshChild1->status);

        // Child 2 remains Good condition, but marked unavailable so it cannot be lent separately
        $freshChild2 = $child2->fresh();
        $this->assertEquals('Good', $freshChild2->condition);
        $this->assertEquals('unavailable', $freshChild2->status);

        // Parent remains Good condition, but marked unavailable because a kit accessory is damaged
        $freshParent = $parent->fresh();
        $this->assertEquals('Good', $freshParent->condition);
        $this->assertEquals('unavailable', $freshParent->status);
    }

    public function test_venue_booking_dispatch_and_return_syncs_tied_child_accessories(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Test Hall',
            'status' => 'available',
        ]);
        $projectorType = EquipmentType::create(['name' => 'Venue Projector', 'category' => 'projector']);
        $hdmiType = EquipmentType::create(['name' => 'Venue HDMI Cable', 'category' => 'cable']);

        $child = EquipmentUnit::create([
            'equipment_type_id' => $hdmiType->id,
            'barcode' => 'HDMI-VB-01',
            'status' => 'built-in',
            'condition' => 'Good',
        ]);
        $parent = EquipmentUnit::create([
            'equipment_type_id' => $projectorType->id,
            'barcode' => 'PRJ-VB-01',
            'status' => 'available',
            'condition' => 'Good',
            'built_in_units' => [(string)$child->id],
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VB-KIT-001',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 1,
            'status'           => 'approved',
        ]);

        $booking = VenueBooking::create([
            'venue_id' => $venue->id,
            'tracking_number_id' => $tracking->id,
            'submission_channel' => 'online_self',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'filer_name' => 'Carlos Mendoza',
            'email_address' => 'carlos@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'faculty',
            'purpose' => 'Faculty Meeting',
            'date_of_usage' => now()->toDateString(),
            'time_start' => '13:00:00',
            'time_end' => '15:00:00',
            'no_of_person' => 30,
            'assigned_units' => ['projector' => 'PRJ-VB-01'],
            'status' => 'approved',
        ]);
        $tracking->update(['reservation_id' => $booking->id]);

        // Dispatch venue booking
        $res = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/ongoing");
        $res->assertStatus(200);

        // Parent and child accessory both released
        $this->assertEquals('released', $parent->fresh()->status);
        $this->assertEquals('released', $child->fresh()->status);

        // Complete return
        $resReturn = $this->actingAs($this->staffUser)
            ->postJson("/api/avr-venue-bookings/{$booking->id}/complete", [
                'condition' => 'good',
            ]);
        $resReturn->assertStatus(200);

        // Parent available, child built-in
        $this->assertEquals('available', $parent->fresh()->status);
        $this->assertEquals('built-in', $child->fresh()->status);
    }
}
