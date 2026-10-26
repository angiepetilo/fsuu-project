<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionsRbacTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $staffUser;
    protected Role $staffRole;

    protected function setUp(): void
    {
        parent::setUp();

        $superAdminRole = Role::create([
            'name' => 'super_admin',
            'permissions' => ['*'],
        ]);

        $this->superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@urios.edu.ph',
            'password' => bcrypt('password'),
            'role_id' => $superAdminRole->id,
            'is_active' => true,
            'status' => 'active',
            'permissions' => ['*'],
        ]);

        $this->staffRole = Role::create([
            'name' => 'staff',
            'description' => 'Staff operational role',
            'permissions' => [
                'dashboard.metrics',
                'manage_venues.view',
            ],
        ]);

        $this->staffUser = User::create([
            'name' => 'Staff Member',
            'email' => 'staff@urios.edu.ph',
            'password' => bcrypt('password'),
            'role_id' => $this->staffRole->id,
            'is_active' => true,
            'status' => 'active',
            'permissions' => $this->staffRole->permissions,
        ]);
    }

    public function test_superadmin_can_fetch_roles_list(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/sysad/roles');

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'staff']);
    }

    public function test_superadmin_can_get_and_save_permissions_for_a_role(): void
    {
        // 1. Get permissions
        $getRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/sysad/roles/{$this->staffRole->id}/permissions");

        $getRes->assertOk();
        $getRes->assertJsonFragment(['role_name' => 'staff']);
        $this->assertContains('dashboard.metrics', $getRes->json('permissions'));

        // 2. Save updated permissions
        $newPerms = [
            'dashboard.metrics',
            'dashboard.quick_venue',
            'venue_bookings.reject',
            'settings.venues',
        ];

        $saveRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/sysad/roles/{$this->staffRole->id}/permissions", [
                'permissions' => $newPerms,
            ]);

        $saveRes->assertOk();
        $saveRes->assertJsonFragment(['message' => 'Permissions updated for all staff accounts.']);

        // 3. Verify role model was updated
        $this->staffRole->refresh();
        $this->assertEquals($newPerms, $this->staffRole->permissions);

        // 4. Verify assigned staff user automatically inherited the new permissions
        $this->staffUser->refresh();
        $userPerms = is_string($this->staffUser->permissions)
            ? json_decode($this->staffUser->permissions, true)
            : $this->staffUser->permissions;
        $this->assertEquals($newPerms, $userPerms);
    }

    public function test_non_superadmin_without_permission_cannot_modify_role_permissions(): void
    {
        $response = $this->actingAs($this->staffUser, 'sanctum')
            ->postJson("/api/sysad/roles/{$this->staffRole->id}/permissions", [
                'permissions' => ['*'],
            ]);

        $response->assertStatus(403);
    }
}
