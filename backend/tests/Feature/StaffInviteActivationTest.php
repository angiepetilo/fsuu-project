<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

use App\Models\User;
use App\Models\Office;
use App\Models\Role;
use Illuminate\Support\Facades\Queue;
use App\Jobs\SendNewUserCredentialsJob;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR OFFICE', 'code' => 'AVR', 'type' => 'avr']);

    $adminRole = Role::firstOrCreate(['name' => 'admin']);
    $staffRole = Role::firstOrCreate(['name' => 'staff']);

    $this->admin = User::forceCreate([
        'office_id' => $this->office->id,
        'role_id'   => $adminRole->id,
        'name'      => 'AVR Manager',
        'email'     => 'avr.admin@fsuu.edu.ph',
        'password'  => bcrypt('password123'),
        'status'    => 'active',
        'is_active' => true,
    ]);
});

it('allows admin to invite staff with personal email and feature permissions', function () {
    Queue::fake();

    $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', [
        'personal_email' => 'juan@gmail.com',
        'role'           => 'staff',
        'permissions'    => json_encode(['manage_equipments', 'reports']),
    ]);

    $response->assertStatus(201);
    $response->assertJsonStructure(['message', 'user', 'invite_token']);

    $this->assertDatabaseHas('users', [
        'personal_email' => 'juan@gmail.com',
        'office_id'      => $this->office->id,
        'status'         => 'pending_activation',
    ]);
});

it('blocks login attempt for unactivated staff account', function () {
    $staffRole = Role::where('name', 'staff')->first();

    $pendingUser = User::forceCreate([
        'office_id'      => $this->office->id,
        'role_id'        => $staffRole->id,
        'name'           => 'Pending Staff',
        'email'          => 'juan@gmail.com',
        'personal_email' => 'juan@gmail.com',
        'password'       => bcrypt('tempPass123'),
        'status'         => 'pending_activation',
        'invite_token'   => 'test_token_123456789',
        'is_active'      => true,
    ]);

    $response = $this->postJson('/api/login', [
        'email'    => 'juan@gmail.com',
        'password' => 'tempPass123',
    ]);

    $response->assertStatus(403);
    $response->assertJson(['message' => 'Please check your email to activate your account.']);
});

it('fetches invite details using token', function () {
    $staffRole = Role::where('name', 'staff')->first();

    User::forceCreate([
        'office_id'      => $this->office->id,
        'role_id'        => $staffRole->id,
        'name'           => 'Pending Staff',
        'email'          => 'maria@gmail.com',
        'personal_email' => 'maria@gmail.com',
        'password'       => bcrypt('tempPass123'),
        'status'         => 'pending_activation',
        'invite_token'   => 'valid_token_xyz',
        'permissions'    => ['manage_equipments'],
        'is_active'      => true,
    ]);

    $response = $this->getJson('/api/auth/invite/valid_token_xyz');

    $response->assertStatus(200);
    $response->assertJson([
        'email'  => 'maria@gmail.com',
        'office' => 'AVR OFFICE',
        'role'   => 'Staff',
    ]);
});

it('activates account and allows subsequent login', function () {
    $staffRole = Role::where('name', 'staff')->first();

    User::forceCreate([
        'office_id'      => $this->office->id,
        'role_id'        => $staffRole->id,
        'name'           => 'Initial Name',
        'email'          => 'maria@gmail.com',
        'personal_email' => 'maria@gmail.com',
        'password'       => bcrypt('tempPass123'),
        'status'         => 'pending_activation',
        'invite_token'   => 'activation_token_999',
        'is_active'      => true,
    ]);

    $activateResponse = $this->postJson('/api/auth/activate', [
        'token'    => 'activation_token_999',
        'name'     => 'Maria Santos',
        'username' => 'msantos@fsuu.edu.ph',
        'password' => 'newSecurePassword123',
    ]);

    $activateResponse->assertStatus(200);

    $this->assertDatabaseHas('users', [
        'name'           => 'Maria Santos',
        'username'       => 'msantos@fsuu.edu.ph',
        'personal_email' => 'maria@gmail.com',
        'status'         => 'active',
        'invite_token'   => null,
    ]);

    // Test subsequent login with new credentials
    $loginResponse = $this->postJson('/api/login', [
        'email'    => 'msantos@fsuu.edu.ph',
        'password' => 'newSecurePassword123',
    ]);

    $loginResponse->assertStatus(200);
    $loginResponse->assertJsonStructure(['user', 'token']);
});

it('allows admin to resend invite', function () {
    Queue::fake();

    $staffRole = Role::where('name', 'staff')->first();

    $pendingUser = User::forceCreate([
        'office_id'      => $this->office->id,
        'role_id'        => $staffRole->id,
        'name'           => 'Pending Staff',
        'email'          => 'resend@gmail.com',
        'personal_email' => 'resend@gmail.com',
        'password'       => bcrypt('tempPass123'),
        'status'         => 'pending_activation',
        'invite_token'   => 'token_to_resend',
        'is_active'      => true,
    ]);

    $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/users/{$pendingUser->id}/resend-invite");

    $response->assertStatus(200);
    Queue::assertPushed(SendNewUserCredentialsJob::class);
});
