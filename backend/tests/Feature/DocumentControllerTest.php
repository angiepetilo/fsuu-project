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

it('allows authorized staff to download a document', function () {
    $booking = \App\Models\AvrVenueBooking::forceCreate([
        'reference_code' => 'VB-001',
        'requestor_name' => 'John',
        'requestor_email' => 'john@example.com',
        'requestor_contact_number' => '09123456789',
        'requestor_program_office' => 'IT Dept',
        'requestor_identity_type' => 'student',
        'booking_classification' => 'internal',
        'purpose' => 'Test',
        'venue_id' => $this->office->venues()->create(['name' => 'AVR2', 'location' => 'Building A'])->id,
        'status' => 'pending',
        'number_of_persons' => 50,
        'title_of_reservation' => 'Test Event',
        'event_type' => 'Seminar',
        'contact_preference' => 'email',
        'start_datetime' => now(),
        'end_datetime' => now()->addHours(2),
    ]);

    $document = \App\Models\Document::forceCreate([
        'reference_type' => 'avr_venue_booking',
        'reference_id' => $booking->id,
        'file_path' => 'documents/fake.pdf',
        'document_type' => 'endorsement_letter',
        'status' => 'pending',
    ]);
    
    Storage::disk('local')->put('documents/fake.pdf', 'fake pdf content');

    $response = $this->actingAs($this->staff, 'sanctum')
        ->get("/api/documents/{$document->id}/download");

    $response->assertStatus(200);
    $response->assertDownload();
});

it('rejects staff from a DIFFERENT office on download', function () {
    $otherOffice = Office::create(['name' => 'SCO Main', 'code' => 'SCO', 'type' => 'sco']);
    $otherStaff = User::forceCreate([
        'office_id' => $otherOffice->id,
        'role' => 'staff',
        'name' => 'SCO Staff',
        'email' => 'scostaff@test.com',
        'password' => bcrypt('password'),
    ]);

    $booking = \App\Models\AvrVenueBooking::forceCreate([
        'reference_code' => 'VB-001',
        'requestor_name' => 'John',
        'requestor_email' => 'john@example.com',
        'requestor_contact_number' => '09123456789',
        'requestor_program_office' => 'IT Dept',
        'requestor_identity_type' => 'student',
        'booking_classification' => 'internal',
        'purpose' => 'Test',
        'venue_id' => $this->office->venues()->create(['name' => 'AVR2', 'location' => 'Building A'])->id,
        'status' => 'pending',
        'number_of_persons' => 50,
        'title_of_reservation' => 'Test Event',
        'event_type' => 'Seminar',
        'contact_preference' => 'email',
        'start_datetime' => now(),
        'end_datetime' => now()->addHours(2),
    ]);

    $document = \App\Models\Document::forceCreate([
        'reference_type' => 'avr_venue_booking',
        'reference_id' => $booking->id,
        'file_path' => 'documents/fake.pdf',
        'document_type' => 'endorsement_letter',
        'status' => 'pending',
    ]);
    
    Storage::disk('local')->put('documents/fake.pdf', 'fake pdf content');

    $response = $this->actingAs($otherStaff, 'sanctum')
        ->get("/api/documents/{$document->id}/download");

    $response->assertStatus(403);
});

it('rejects unauthenticated request to download', function () {
    $document = \App\Models\Document::forceCreate([
        'reference_type' => 'avr_venue_booking',
        'reference_id' => 1,
        'file_path' => 'documents/fake.pdf',
        'document_type' => 'endorsement_letter',
        'status' => 'pending',
    ]);
    
    $response = $this->getJson("/api/documents/{$document->id}/download");
    
    $response->assertStatus(401);
});

