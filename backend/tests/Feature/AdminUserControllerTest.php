<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

use App\Models\User;
use App\Models\Office;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Queue;
use App\Jobs\SendNewUserCredentialsJob;

beforeEach(function () {
    $this->scoOffice = Office::create(['name' => 'SCO', 'code' => 'SCO', 'type' => 'sco']);

    $superAdminRole = \App\Models\Role::firstOrCreate(['name' => 'super_admin']);
    $staffRole = \App\Models\Role::firstOrCreate(['name' => 'staff']);

    $this->admin = User::forceCreate([
        'office_id' => $this->scoOffice->id,
        'role_id'   => $superAdminRole->id,
        'name'      => 'Admin User',
        'email'     => 'admin@urios.edu.ph',
        'password'  => bcrypt('password'),
    ]);

    $this->staff = User::forceCreate([
        'office_id' => $this->scoOffice->id,
        'role_id'   => $staffRole->id,
        'name'      => 'Staff User',
        'email'     => 'staff_test@urios.edu.ph',
        'password'  => bcrypt('password'),
    ]);
});

it('blocks non-admins from managing users', function () {
    // Add check to store/destroy in controller if non-admin attempts
    $nonAdminRole = \App\Models\Role::firstOrCreate(['name' => 'student']);
    $nonAdminUser = User::forceCreate([
        'office_id' => $this->scoOffice->id,
        'role_id'   => $nonAdminRole->id,
        'name'      => 'Student User',
        'email'     => 'student@urios.edu.ph',
        'password'  => bcrypt('password'),
    ]);

    $this->actingAs($nonAdminUser, 'sanctum')->postJson('/api/admin/users', [
        'name' => 'Test',
        'email' => 'test@test.com'
    ])->assertStatus(403);
});

it('allows admins to fetch users', function () {
    $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users')
        ->assertStatus(200)
        ->assertJsonCount(2); // admin and staff
});

it('allows admins to create a user with an image and dispatches a job', function () {
    Storage::fake('public');
    Queue::fake();

    $file = UploadedFile::fake()->create('avatar.jpg', 100, 'image/jpeg');

    $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'image' => $file
    ]);

    $response->assertStatus(201);
    
    // Check if the user is in DB
    $this->assertDatabaseHas('users', ['email' => 'jane@example.com']);
    
    $user = User::where('email', 'jane@example.com')->first();
    
    // Check avatar was saved
    expect($user->avatar)->toContain('storage/avatars/');
    
    // Check job was dispatched
    Queue::assertPushed(SendNewUserCredentialsJob::class, function ($job) use ($user) {
        return $job->user->id === $user->id;
    });
});

it('allows admins to update a user', function () {
    $response = $this->actingAs($this->admin, 'sanctum')->putJson('/api/admin/users/' . $this->staff->id, [
        'name' => 'Updated Staff',
        'email' => 'updated@test.com'
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('users', ['email' => 'updated@test.com', 'name' => 'Updated Staff']);
});

it('allows admins to delete a user', function () {
    $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/admin/users/' . $this->staff->id)
        ->assertStatus(200);

    $this->assertSoftDeleted('users', ['id' => $this->staff->id]);
});

it('prevents admins from deleting themselves', function () {
    $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/admin/users/' . $this->admin->id)
        ->assertStatus(403);
});

it('allows super admin to invite branch admin with personal email and office id', function () {
    Queue::fake();

    $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', [
        'personal_email' => 'maria.santos@gmail.com',
        'office_id'      => $this->scoOffice->id,
    ]);

    $response->assertStatus(201);
    $response->assertJsonStructure(['message', 'user', 'invite_token']);

    $this->assertDatabaseHas('users', [
        'personal_email' => 'maria.santos@gmail.com',
        'office_id'      => $this->scoOffice->id,
        'status'         => 'pending_activation',
    ]);
});
