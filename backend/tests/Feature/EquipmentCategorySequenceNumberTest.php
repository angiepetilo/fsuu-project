<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EquipmentCategorySequenceNumberTest extends TestCase
{
    use RefreshDatabase;

    private User $staffUser;
    private EquipmentType $projectorType;
    private EquipmentType $microphoneType;

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

        $this->projectorType = EquipmentType::create([
            'name' => 'Projector',
            'category' => 'projector',
            'is_public' => true,
        ]);

        $this->microphoneType = EquipmentType::create([
            'name' => 'Microphone',
            'category' => 'audio',
            'is_public' => true,
        ]);
    }

    public function test_different_categories_can_share_same_sequence_number(): void
    {
        // 1. Create unit in Projector category with seq_no '#001'
        $res1 = $this->actingAs($this->staffUser)
            ->postJson('/api/general/equipment-units', [
                'equipment_type_id' => $this->projectorType->id,
                'brand'             => 'Epson',
                'model'             => 'EB-X06',
                'seq_no'            => '#001',
                'serial_number'     => 'SN-EPSON-001',
                'status'            => 'available',
                'condition'         => 'Good',
            ]);
        $res1->assertStatus(201);

        // 2. Create unit in Microphone category ALSO with seq_no '#001'
        $res2 = $this->actingAs($this->staffUser)
            ->postJson('/api/general/equipment-units', [
                'equipment_type_id' => $this->microphoneType->id,
                'brand'             => 'Shure',
                'model'             => 'SM58',
                'seq_no'            => '#001',
                'serial_number'     => 'SN-SHURE-001',
                'status'            => 'available',
                'condition'         => 'Good',
            ]);
        $res2->assertStatus(201);

        $this->assertDatabaseHas('equipment_units', [
            'equipment_type_id' => $this->projectorType->id,
            'seq_no'            => '#001',
        ]);
        $this->assertDatabaseHas('equipment_units', [
            'equipment_type_id' => $this->microphoneType->id,
            'seq_no'            => '#001',
        ]);
    }

    public function test_same_category_rejects_duplicate_sequence_number_on_create(): void
    {
        // First projector with seq_no '#001'
        EquipmentUnit::create([
            'equipment_type_id' => $this->projectorType->id,
            'brand'             => 'Epson',
            'model'             => 'EB-X06',
            'seq_no'            => '#001',
            'serial_number'     => 'SN-EPSON-001',
            'barcode'           => 'SN-EPSON-001',
            'status'            => 'available',
            'condition'         => 'Good',
        ]);

        // Attempting to create second projector with same seq_no '#001'
        $res = $this->actingAs($this->staffUser)
            ->postJson('/api/general/equipment-units', [
                'equipment_type_id' => $this->projectorType->id,
                'brand'             => 'Sony',
                'model'             => 'VPL',
                'seq_no'            => '#001',
                'serial_number'     => 'SN-SONY-002',
                'status'            => 'available',
                'condition'         => 'Good',
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['seq_no']);
    }

    public function test_updating_unit_retaining_its_own_sequence_number_succeeds(): void
    {
        $unit = EquipmentUnit::create([
            'equipment_type_id' => $this->projectorType->id,
            'brand'             => 'Epson',
            'model'             => 'EB-X06',
            'seq_no'            => '#001',
            'serial_number'     => 'SN-EPSON-001',
            'barcode'           => 'SN-EPSON-001',
            'status'            => 'available',
            'condition'         => 'Good',
        ]);

        // Update the unit while keeping seq_no '#001' - must NOT collide with itself
        $res = $this->actingAs($this->staffUser)
            ->putJson("/api/general/equipment-units/{$unit->id}", [
                'equipment_type_id' => $this->projectorType->id,
                'brand'             => 'Epson Updated',
                'model'             => 'EB-X06-Pro',
                'seq_no'            => '#001',
                'serial_number'     => 'SN-EPSON-001',
                'status'            => 'available',
                'condition'         => 'Good',
            ]);

        $res->assertStatus(200);
        $this->assertEquals('Epson Updated', $unit->fresh()->brand);
        $this->assertEquals('#001', $unit->fresh()->seq_no);
    }

    public function test_updating_unit_to_duplicate_sequence_number_in_same_category_fails(): void
    {
        EquipmentUnit::create([
            'equipment_type_id' => $this->projectorType->id,
            'brand'             => 'Epson',
            'model'             => 'EB-X01',
            'seq_no'            => '#001',
            'serial_number'     => 'SN-EPSON-001',
            'barcode'           => 'SN-EPSON-001',
            'status'            => 'available',
            'condition'         => 'Good',
        ]);

        $unit2 = EquipmentUnit::create([
            'equipment_type_id' => $this->projectorType->id,
            'brand'             => 'Epson',
            'model'             => 'EB-X02',
            'seq_no'            => '#002',
            'serial_number'     => 'SN-EPSON-002',
            'barcode'           => 'SN-EPSON-002',
            'status'            => 'available',
            'condition'         => 'Good',
        ]);

        // Attempting to change unit2's seq_no to '#001' (which unit1 already has in projector)
        $res = $this->actingAs($this->staffUser)
            ->putJson("/api/general/equipment-units/{$unit2->id}", [
                'equipment_type_id' => $this->projectorType->id,
                'seq_no'            => '#001',
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['seq_no']);
    }
}
