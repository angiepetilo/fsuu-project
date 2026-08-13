<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
use App\Models\Office;
use App\Models\User;
use App\Models\Role;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\TrackingNumber;
use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->office = Office::create(['name' => 'AVR Main', 'code' => 'AVR-M', 'type' => 'avr']);
    $staffRole = Role::firstOrCreate(['name' => 'staff']);
    $this->staff = User::forceCreate([
        'office_id' => $this->office->id,
        'role_id'   => $staffRole->id,
        'name'      => 'AVR Staff',
        'email'     => 'avrstaff@test.com',
        'password'  => bcrypt('password'),
    ]);

    $this->venue = Venue::create(['office_id' => $this->office->id, 'name' => 'AVR1', 'location' => 'FSUU Main', 'is_active' => true]);
    $this->tracking = TrackingNumber::forceCreate(['reference_code' => 'VN-2026-0001', 'status' => 'pending', 'reservation_type' => 'venue_booking', 'reservation_id' => 1]);
    $this->booking = VenueBooking::forceCreate([
        'venue_id'           => $this->venue->id,
        'tracking_number_id' => $this->tracking->id,
        'filer_name'         => 'Juan Dela Cruz',
        'email_address'      => 'juan@test.com',
        'date_of_usage'      => '2026-09-01',
        'time_start'         => '08:00:00',
        'time_end'           => '10:00:00',
        'purpose'            => 'Event',
        'classification'     => 'student',
        'contact_number'     => '09123456789',
        'place_of_use'       => 'inside',
        'program_office'     => 'CS',
        'no_of_person'       => 10,
        'submission_channel' => 'kiosk',
    ]);

    Storage::fake('local');
});

it('uploads a document', function () {
    $file = UploadedFile::fake()->create('document.pdf', 1024, 'application/pdf');

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson('/api/documents', [
            'file'           => $file,
            'reference_type' => 'avr_venue_booking',
            'reference_id'   => $this->booking->id,
            'document_type'  => 'excuse_letter',
        ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('documents', [
        'venue_booking_id' => $this->booking->id,
        'document_type'    => 'excuse_letter',
    ]);

    $document = Document::first();
    Storage::disk('local')->assertExists($document->file_path);
});

it('approves a document', function () {
    $document = Document::forceCreate([
        'venue_booking_id' => $this->booking->id,
        'file_path'        => 'documents/fake.pdf',
        'document_type'    => 'excuse_letter',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/documents/{$document->id}/approve", [
            'remarks' => 'Looks good',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'approved');
});

it('rejects a document', function () {
    $document = Document::forceCreate([
        'venue_booking_id' => $this->booking->id,
        'file_path'        => 'documents/fake.pdf',
        'document_type'    => 'excuse_letter',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')
        ->postJson("/api/documents/{$document->id}/reject", [
            'remarks' => 'Missing signature',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'rejected');
});
