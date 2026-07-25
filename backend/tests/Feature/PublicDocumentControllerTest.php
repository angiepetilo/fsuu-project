<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use App\Models\AvrVenueBooking;
use App\Models\Venue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $this->venue = Venue::forceCreate(['name' => 'AVR1', 'office_id' => $this->office->id, 'location' => 'Building A']);
    
    $this->booking = AvrVenueBooking::forceCreate([
        'reference_code' => 'REF-123',
        'requestor_email' => 'user@example.com',
        'requestor_contact_number' => '09123456789',
        'requestor_program_office' => 'IT Dept',
        'requestor_identity_type' => 'student',
        'booking_classification' => 'internal',
        'purpose' => 'Test',
        'requestor_name' => 'Test User',
        'venue_id' => $this->venue->id,
        'status' => 'pending',
        'number_of_persons' => 50,
        'title_of_reservation' => 'Test Event',
        'event_type' => 'Seminar',
        'contact_preference' => 'email',
        'start_datetime' => now(),
        'end_datetime' => now()->addHours(2),
    ]);

    Storage::fake('local');
});

it('publicly uploads a document with valid reference_code and email', function () {
    $file = UploadedFile::fake()->create('endorsement.pdf', 1024, 'application/pdf');

    $response = $this->postJson('/api/public/documents', [
        'file' => $file,
        'reference_type' => 'avr_venue_booking',
        'reference_code' => 'REF-123',
        'requestor_email' => 'user@example.com',
        'document_type' => 'some_hacked_type', // Should be ignored
    ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('documents', [
        'reference_type' => 'avr_venue_booking',
        'reference_id' => $this->booking->id,
        'document_type' => 'endorsement_letter', // Hardcoded
        'status' => 'pending', // Hardcoded
        'uploaded_by' => null,
    ]);

    $document = \App\Models\Document::first();
    Storage::disk('local')->assertExists($document->file_path);
});

it('rejects public upload with invalid reference_code or email', function () {
    $file = UploadedFile::fake()->create('endorsement.pdf', 1024, 'application/pdf');

    $response = $this->postJson('/api/public/documents', [
        'file' => $file,
        'reference_type' => 'avr_venue_booking',
        'reference_code' => 'REF-123',
        'requestor_email' => 'wrong@example.com',
    ]);

    $response->assertStatus(403);
});
