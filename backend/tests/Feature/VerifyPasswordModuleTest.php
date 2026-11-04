<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class VerifyPasswordModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $officeHeadWithPinPerm;
    private User $staffWithoutPinPerm;

    protected function setUp(): void
    {
        parent::setUp();

        $superRole = Role::firstOrCreate(['name' => 'super_admin']);
        $this->superAdmin = User::create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@urios.edu.ph',
            'password' => Hash::make('superadmin_password_123'),
            'role_id' => $superRole->id,
        ]);

        $staffRole = Role::firstOrCreate(['name' => 'staff']);
        $this->officeHeadWithPinPerm = User::create([
            'name' => 'Office Head Custodian',
            'email' => 'officehead@urios.edu.ph',
            'password' => Hash::make('head_secret_pass_456'),
            'role_id' => $staffRole->id,
            'permissions' => ['settings.pin'],
        ]);

        $this->staffWithoutPinPerm = User::create([
            'name' => 'Regular Desk Staff',
            'email' => 'regularstaff@urios.edu.ph',
            'password' => Hash::make('staff_secret_789'),
            'role_id' => $staffRole->id,
            'permissions' => ['venue_bookings.view'],
        ]);
    }

    public function test_office_head_with_pin_permission_can_unlock_module_using_own_password(): void
    {
        $response = $this->actingAs($this->officeHeadWithPinPerm)
            ->postJson('/api/verify-password', [
                'password' => 'head_secret_pass_456',
                'superadmin_only' => true,
                'module' => 'Verification PIN',
                'tab' => 'pin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
            ]);
    }

    public function test_office_head_entering_wrong_password_is_rejected(): void
    {
        $response = $this->actingAs($this->officeHeadWithPinPerm)
            ->postJson('/api/verify-password', [
                'password' => 'wrong_password_999',
                'superadmin_only' => true,
                'module' => 'Verification PIN',
                'tab' => 'pin',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'valid' => false,
            ]);
    }

    public function test_super_admin_can_unlock_module_using_own_password(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/verify-password', [
                'password' => 'superadmin_password_123',
                'superadmin_only' => true,
                'module' => 'Verification PIN',
                'tab' => 'pin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
            ]);
    }

    public function test_super_admin_password_still_acts_as_supervisor_fallback_for_staff(): void
    {
        $response = $this->actingAs($this->staffWithoutPinPerm)
            ->postJson('/api/verify-password', [
                'password' => 'superadmin_password_123',
                'superadmin_only' => true,
                'module' => 'Verification PIN',
                'tab' => 'pin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
            ]);
    }
}
