<?php

namespace Tests\Feature;

use App\Models\Venue;
use App\Services\EquipmentBorrowingService;
use App\Services\VenueBookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DuplicateBookingPreSubmitCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_venue_checkduplicate_detects_case_insensitive_name_match(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Test Hall',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $service = app(VenueBookingService::class);

        // First submission: "angie petilo" in lowercase
        $booking = $service->create([
            'venue_id'                 => $venue->id,
            'first_name'               => 'angie',
            'last_name'                => 'petilo',
            'requestor_name'           => 'angie petilo',
            'requestor_email'          => 'angie.petilo@urios.edu.ph',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CITEC',
            'purpose'                  => 'Org Meeting',
            'number_of_persons'        => 20,
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => null,
        ]);
        $this->assertNotNull($booking->id);

        // Second attempt: SAME person, but name typed in ALL CAPS for the same slot.
        $duplicate = $service->checkDuplicate([
            'venue_id'                 => $venue->id,
            'first_name'               => 'ANGIE',
            'last_name'                => 'PETILO',
            'email_address'            => 'ANGIE.PETILO@URIOS.EDU.PH',
            'program_office'           => 'CITEC',
            'contact_number'           => '09171234567',
            'purpose'                  => 'Org Meeting',
            'number_of_persons'        => 20,
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
        ]);

        $this->assertNotNull($duplicate, 'Expected a duplicate to be detected despite different name/email casing.');
        $this->assertSame('pending', $duplicate['status']);
    }

    public function test_venue_checkduplicate_returns_null_for_different_requestor(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Test Hall 2',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $service = app(VenueBookingService::class);

        $service->create([
            'venue_id'                 => $venue->id,
            'first_name'               => 'Angie',
            'last_name'                => 'Petilo',
            'requestor_name'           => 'Angie Petilo',
            'requestor_email'          => 'angie.petilo@urios.edu.ph',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CITEC',
            'purpose'                  => 'Org Meeting',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => null,
        ]);

        $duplicate = $service->checkDuplicate([
            'venue_id'                 => $venue->id,
            'first_name'               => 'John',
            'last_name'                => 'Cruz',
            'email_address'            => 'john.cruz@urios.edu.ph',
            'program_office'           => 'CCJE',
            'contact_number'           => '09179999999',
            'purpose'                  => 'Different Activity',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
        ]);

        $this->assertNull($duplicate);
    }

    public function test_venue_checkduplicate_http_endpoint_flags_duplicate(): void
    {
        $venue = Venue::create([
            'name' => 'AVR Test Hall 3',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        app(VenueBookingService::class)->create([
            'venue_id'                 => $venue->id,
            'first_name'               => 'Angie',
            'last_name'                => 'Petilo',
            'requestor_name'           => 'Angie Petilo',
            'requestor_email'          => 'angie.petilo@urios.edu.ph',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CITEC',
            'purpose'                  => 'Org Meeting',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => null,
        ]);

        $response = $this->postJson('/api/public/avr-venue-bookings/check-duplicate', [
            'venue_id'       => $venue->id,
            'first_name'     => 'ANGIE',
            'last_name'      => 'PETILO',
            'email_address'  => 'ANGIE.PETILO@URIOS.EDU.PH',
            'program_office' => 'CITEC',
            'contact_number' => '09171234567',
            'purpose'        => 'Org Meeting',
            'date_of_usage'  => now()->addDays(5)->toDateString(),
            'time_start'     => '08:00:00',
            'time_end'       => '10:00:00',
        ]);

        $response->assertOk();
        $response->assertJson(['duplicate' => true]);
        $response->assertJsonPath('details.reference_code', fn ($code) => !empty($code));
    }

    public function test_venue_checkduplicate_requires_all_three_fields_name_email_contact_to_match(): void
    {
        // Regression test matching the real screenshot scenario: same name + same
        // contact number, but a DIFFERENT email -> under the "name AND email AND
        // contact number must ALL match" rule, this must NOT be flagged.
        $venue = Venue::create([
            'name' => 'Avr2',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $service = app(VenueBookingService::class);

        $service->create([
            'venue_id'                 => $venue->id,
            'first_name'               => 'TEST 2',
            'last_name'                => 'TEST 2',
            'requestor_name'           => 'TEST 2 TEST 2',
            'requestor_email'          => 'angie.petiloo@gmail.com',
            'requestor_contact_number' => '0947 275 0431',
            'requestor_program_office' => 'CoA',
            'purpose'                  => 'class',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '17:00:00',
            'submitted_by'             => null,
        ]);

        // Same name + same contact number, but a different email.
        $notADuplicate = $service->checkDuplicate([
            'venue_id'                 => $venue->id,
            'first_name'               => 'test 2',
            'last_name'                => 'test 2',
            'email_address'            => 'kelesteangie@gmail.com',
            'program_office'           => 'CoA',
            'contact_number'           => '0947 275 0431',
            'purpose'                  => 'class',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '17:00:00',
        ]);
        $this->assertNull($notADuplicate, 'Email differs, so this must NOT be flagged under the all-three-must-match rule.');

        // Same name + same email (different casing) + same contact number -> IS a duplicate.
        $isADuplicate = $service->checkDuplicate([
            'venue_id'                 => $venue->id,
            'first_name'               => 'test 2',
            'last_name'                => 'test 2',
            'email_address'            => 'ANGIE.PETILOO@GMAIL.COM',
            'program_office'           => 'CoA',
            'contact_number'           => '0947 275 0431',
            'purpose'                  => 'class',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '17:00:00',
        ]);
        $this->assertNotNull($isADuplicate, 'Name, email, and contact number all match -> should be flagged as a duplicate.');
    }

    public function test_venue_checkduplicate_does_not_flag_same_requestor_booking_a_different_venue(): void
    {
        // The same person booking a DIFFERENT venue (even for the exact same date/time
        // and identity details) must NOT be flagged as a duplicate.
        $venueA = Venue::create([
            'name' => 'Avr A',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);
        $venueB = Venue::create([
            'name' => 'Avr B',
            'location' => 'Main Campus',
            'capacity' => 100,
            'status' => 'available',
        ]);

        $service = app(VenueBookingService::class);

        $service->create([
            'venue_id'                 => $venueA->id,
            'first_name'               => 'Angie',
            'last_name'                => 'Petilo',
            'requestor_name'           => 'Angie Petilo',
            'requestor_email'          => 'angie.petilo@urios.edu.ph',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CITEC',
            'purpose'                  => 'Org Meeting',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
            'submitted_by'             => null,
        ]);

        // Same person, same identity details, same slot, but a DIFFERENT venue.
        $duplicate = $service->checkDuplicate([
            'venue_id'                 => $venueB->id,
            'first_name'               => 'Angie',
            'last_name'                => 'Petilo',
            'email_address'            => 'angie.petilo@urios.edu.ph',
            'program_office'           => 'CITEC',
            'contact_number'           => '09171234567',
            'purpose'                  => 'Org Meeting',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => '08:00:00',
            'time_end'                 => '10:00:00',
        ]);

        $this->assertNull($duplicate, 'Booking a different venue should not be flagged as a duplicate even for the same person/slot.');
    }

    public function test_equipment_checkduplicate_detects_case_insensitive_name_match(): void
    {
        $eqType = \App\Models\EquipmentType::create([
            'eq_name' => 'Projector',
            'total_quantity' => 5,
        ]);

        $service = app(EquipmentBorrowingService::class);

        $borrowing = $service->create([
            'first_name'               => 'angie',
            'last_name'                => 'petilo',
            'requestor_name'           => 'angie petilo',
            'requestor_email'          => 'angie.petilo@urios.edu.ph',
            'requestor_contact_number' => '09171234567',
            'requestor_program_office' => 'CITEC',
            'requestor_identity_type'  => 'student',
            'purpose'                  => 'Class Presentation',
            'place_of_use'             => 'Room 101',
            'start_datetime'           => now()->addDay()->setTime(8, 0)->toDateTimeString(),
            'end_datetime'             => now()->addDay()->setTime(10, 0)->toDateTimeString(),
            'items'                    => [
                ['equipment_type_id' => $eqType->id, 'quantity_requested' => 1],
            ],
        ]);
        $this->assertNotNull($borrowing->id);

        $duplicate = $service->checkDuplicate([
            'first_name'      => 'ANGIE',
            'last_name'       => 'PETILO',
            'email_address'   => 'ANGIE.PETILO@URIOS.EDU.PH',
            'program_office'  => 'CITEC',
            'contact_number'  => '09171234567',
            'purpose'         => 'Class Presentation',
            'start_datetime'  => now()->addDay()->setTime(8, 0)->toDateTimeString(),
            'end_datetime'    => now()->addDay()->setTime(10, 0)->toDateTimeString(),
        ]);

        $this->assertNotNull($duplicate, 'Expected a duplicate to be detected despite different name/email casing.');
        $this->assertSame('pending', $duplicate['status']);
    }
}
