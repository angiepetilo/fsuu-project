<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\EquipmentType;
use Database\Seeders\DatabaseSeeder;

class ApiEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_ping_endpoint(): void
    {
        $response = $this->getJson('/api/ping');
        $response->assertStatus(200);
    }

    public function test_public_venues_endpoint(): void
    {
        $response = $this->getJson('/api/public/venues');
        $response->assertStatus(200);
    }

    public function test_public_departments_endpoint(): void
    {
        $response = $this->getJson('/api/public/departments');
        $response->assertStatus(200);
    }

    public function test_public_equipment_types_endpoint(): void
    {
        $response = $this->getJson('/api/public/equipment-types');
        $response->assertStatus(200);
    }

    public function test_public_booking_requirements_endpoint(): void
    {
        $response = $this->getJson('/api/public/booking-requirements');
        $response->assertStatus(200);
    }

    public function test_public_operating_hours_endpoint(): void
    {
        $response = $this->getJson('/api/public/operating-hours');
        $response->assertStatus(200);
    }

    public function test_public_verification_pin_settings_endpoint(): void
    {
        $response = $this->getJson('/api/public/verification-pin-settings');
        $response->assertStatus(200);
    }

    public function test_authenticated_admin_endpoints(): void
    {
        $admin = User::first();
        $this->assertNotNull($admin, 'Admin user must exist from UserSeeder.');

        $token = $admin->createToken('test-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];

        // Test admin users
        $response = $this->withHeaders($headers)->getJson('/api/admin/users');
        $response->assertStatus(200);

        // Test admin equipment types
        $response = $this->withHeaders($headers)->getJson('/api/admin/equipment-types');
        $response->assertStatus(200);

        // Test admin equipment units
        $response = $this->withHeaders($headers)->getJson('/api/admin/equipment-units');
        $response->assertStatus(200);

        // Test admin venues
        $response = $this->withHeaders($headers)->getJson('/api/admin/venues');
        $response->assertStatus(200);

        // Test admin departments
        $response = $this->withHeaders($headers)->getJson('/api/admin/departments');
        $response->assertStatus(200);

        // Test admin verification pin
        $response = $this->withHeaders($headers)->getJson('/api/admin/verification-pin');
        $response->assertStatus(200);

        // Test inspections
        $response = $this->withHeaders($headers)->getJson('/api/inspections');
        $response->assertStatus(200);
    }

    public function test_inspection_saving_and_retrieval_integrity(): void
    {
        $admin = User::first();
        $token = $admin->createToken('test-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];

        $payload = [
            'inspectable_type' => 'equipment_borrow',
            'inspectable_id' => 1,
            'inspection_type' => 'pre_release',
            'assigned_units' => ['BC-EQP-001', 'BC-EQP-002'],
            'unit_conditions' => [
                'BC-EQP-001' => ['condition' => 'Good', 'missing_accessories' => 'None', 'notes' => 'Tested working'],
                'BC-EQP-002' => ['condition' => 'Good', 'missing_accessories' => 'None', 'notes' => 'Clean'],
            ],
            'notes' => 'Pre-release inspection complete and verified.',
        ];

        $postRes = $this->withHeaders($headers)->postJson('/api/inspections', $payload);
        $postRes->assertStatus(200);

        $getRes = $this->withHeaders($headers)->getJson('/api/inspections?inspectable_type=equipment_borrow&inspectable_id=1');
        $getRes->assertStatus(200);
        $data = $getRes->json();
        
        $this->assertNotEmpty($data);
        $first = $data[0];
        $this->assertEquals('pre_release', $first['inspection_type']);
        $this->assertEquals('Pre-release inspection complete and verified.', $first['notes']);
        $this->assertIsArray($first['assigned_units']);
        $this->assertIsArray($first['unit_conditions']);
    }
}
