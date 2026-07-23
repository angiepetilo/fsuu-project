<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role' => 'staff',
        'name' => 'AVR Staff',
        'email' => 'avrstaff@test.com',
        'password' => bcrypt('password'),
    ]);

    Storage::fake('local');
});

it('uploads a document', function () {
    $file = UploadedFile::fake()->create('document.pdf', 1024, 'application/pdf');

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/documents', [
            'file' => $file,
            'reference_type' => 'avr_venue_booking',
            'reference_id' => 1,
            'document_type' => 'excuse_letter',
        ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('documents', [
        'reference_type' => 'avr_venue_booking',
        'reference_id' => 1,
        'document_type' => 'excuse_letter',
        'uploaded_by' => $this->staff->id,
    ]);

    $document = \App\Models\Document::first();
    Storage::disk('local')->assertExists($document->file_path);
});

it('approves a document', function () {
    $document = \App\Models\Document::forceCreate([
        'reference_type' => 'avr_venue_booking',
        'reference_id' => 1,
        'file_path' => 'documents/fake.pdf',
        'document_type' => 'excuse_letter',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/documents/{$document->id}/approve", [
            'remarks' => 'Looks good',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'approved');
});

it('rejects a document', function () {
    $document = \App\Models\Document::forceCreate([
        'reference_type' => 'avr_venue_booking',
        'reference_id' => 1,
        'file_path' => 'documents/fake.pdf',
        'document_type' => 'excuse_letter',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/documents/{$document->id}/reject", [
            'remarks' => 'Missing signature',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'rejected');
});
