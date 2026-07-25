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

    $this->admin = User::forceCreate([
        'office_id' => $this->scoOffice->id,
        'role'      => 'super_admin',
        'name'      => 'Admin User',
        'email'     => 'admin@urios.edu.ph',
        'password'  => bcrypt('password'),
    ]);

    $this->staff = User::forceCreate([
        'office_id' => $this->scoOffice->id,
        'role'      => 'staff',
        'name'      => 'Staff User',
        'email'     => 'staff@urios.edu.ph',
        'password'  => bcrypt('password'),
    ]);
});

it('blocks non-admins from managing users', function () {
    $this->actingAs($this->staff, 'sanctum')->postJson('/api/admin/users', [
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
        'personal_email' => 'jane.personal@example.com',
        'role' => 'staff',
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
        'email' => 'updated@test.com',
        'personal_email' => 'updated.personal@test.com',
        'role' => 'staff',
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('users', ['email' => 'updated@test.com', 'name' => 'Updated Staff']);
});

it('allows admins to delete a user', function () {
    $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/admin/users/' . $this->staff->id)
        ->assertStatus(200);

    $this->assertDatabaseMissing('users', ['id' => $this->staff->id]);
});

it('prevents admins from deleting themselves', function () {
    $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/admin/users/' . $this->admin->id)
        ->assertStatus(403);
});
