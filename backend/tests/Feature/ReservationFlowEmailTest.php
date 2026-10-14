<?php

namespace Tests\Feature;

use App\Mail\BookingConfirmationMail;
use App\Mail\BookingStatusUpdateMail;
use App\Models\EquipmentBorrow;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Role;
use App\Models\TrackingNumber;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Services\VenueBookingService;
use App\Services\VenueReminderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReservationFlowEmailTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        $role = Role::firstOrCreate(['name' => 'admin']);
        return User::create([
            'name'     => 'Admin Test',
            'email'    => 'admin+' . uniqid() . '@fsuu.edu.ph',
            'password' => bcrypt('password123'),
            'role_id'  => $role->id,
        ]);
    }

    private function makeVenue(): Venue
    {
        return Venue::create([
            'name'     => 'AVR-1 Main',
            'location' => 'Main Campus 2nd Floor',
            'capacity' => 120,
            'status'   => 'available',
        ]);
    }

    public function test_venue_booking_confirmation_renders_external_client(): void
    {
        $venue = $this->makeVenue();
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VN-202610-EXT01',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 1,
            'status'           => 'pending',
        ]);

        $booking = VenueBooking::create([
            'tracking_number_id'      => $tracking->id,
            'venue_id'                => $venue->id,
            'submission_channel'      => 'online_self',
            'first_name'              => 'Robert',
            'last_name'               => 'Fox',
            'filer_name'              => 'Robert Fox',
            'email_address'           => 'robert.fox@externcorp.com',
            'contact_number'          => '09171234567',
            'classification'          => 'external',
            'requestor_identity_type' => 'external',
            'program_office'          => 'Apex Events Corp',
            'purpose'                 => 'Regional Youth Tech Summit',
            'no_of_person'            => 100,
            'date_of_usage'           => now()->addDays(5)->toDateString(),
            'time_start'              => '09:00:00',
            'time_end'                => '17:00:00',
            'status'                  => 'pending',
        ]);

        $mail = new BookingConfirmationMail('venue', $booking);
        $html = $mail->render();

        $this->assertStringContainsString('Apex Events Corp', $html);
        $this->assertStringContainsString('External Client', $html);
        $this->assertStringContainsString('VN-202610-EXT01', $html);
        $this->assertStringContainsString('Government ID', $html);
        $this->assertStringContainsString('Fee Matrix', $html);
    }

    public function test_equipment_borrowing_status_updates_render_itemized_units(): void
    {
        $eqType = EquipmentType::create([
            'name'        => 'Wireless Microphone Kit',
            'eq_name'     => 'Wireless Mic',
            'status'      => 'available',
            'description' => 'Shure Wireless Microphones',
        ]);

        $unit1 = EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'brand'             => 'Shure',
            'model'             => 'BLX24/PG58',
            'serial_number'     => 'SN-SHURE-9901',
            'barcode'           => 'BC-MIC-001',
            'status'            => 'borrowed',
            'condition'         => 'Good',
            'built_in_units'    => ['2x AA Batteries', 'Receiver Unit', 'Audio Cable 2m'],
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-202610-EXT02',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 1,
            'status'           => 'ongoing',
        ]);

        $borrow = EquipmentBorrow::create([
            'tracking_number_id'      => $tracking->id,
            'submission_channel'      => 'online_self',
            'first_name'              => 'Elena',
            'last_name'               => 'Reyes',
            'filer_name'              => 'Elena Reyes',
            'email_address'           => 'elena@provincialgov.ph',
            'contact_number'          => '09187654321',
            'classification'          => 'external',
            'requestor_identity_type' => 'external',
            'program_office'          => 'Provincial Information Office',
            'purpose'                 => 'Public Briefing Coverage',
            'date_of_usage'           => now()->toDateString(),
            'time_start'              => '08:00:00',
            'time_end'                => '12:00:00',
            'assigned_units'          => [$unit1->barcode],
            'status'                  => 'ongoing',
        ]);

        // 1. Released / On-going status test
        $releaseMail = new BookingStatusUpdateMail('equipment', $borrow, 'on-going');
        $releaseHtml = $releaseMail->render();

        $this->assertStringContainsString('BC-MIC-001', $releaseHtml);
        $this->assertStringContainsString('Shure BLX24/PG58', $releaseHtml);
        $this->assertStringContainsString('Receiver Unit', $releaseHtml);
        $this->assertStringContainsString('External Custody', $releaseHtml);

        // 2. Completed / Return clearance status test with condition
        $borrow->unit_conditions = [
            'BC-MIC-001' => ['condition' => 'Good', 'notes' => 'Returned complete'],
        ];
        $completeMail = new BookingStatusUpdateMail('equipment', $borrow, 'completed', 'All accessories accounted for.');
        $completeHtml = $completeMail->render();

        $this->assertStringContainsString('PASS — GOOD COND.', $completeHtml);
        $this->assertStringContainsString('Custodial Clearance Certificate', $completeHtml);
        $this->assertStringContainsString('All accessories accounted for.', $completeHtml);
    }

    public function test_equipment_borrowing_only_approved_does_not_show_gatepass(): void
    {
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-202610-APP01',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 10,
            'status'           => 'approved',
        ]);

        $borrow = EquipmentBorrow::create([
            'tracking_number_id'      => $tracking->id,
            'submission_channel'      => 'online_self',
            'first_name'              => 'Angie',
            'last_name'               => 'Petilo',
            'filer_name'              => 'Angie Petilo',
            'email_address'           => 'angie.petilo@urios.edu.ph',
            'contact_number'          => '09123456789',
            'classification'          => 'student',
            'requestor_identity_type' => 'student',
            'program_office'          => 'College of Computing Studies',
            'purpose'                 => 'Class Capstone Presentation',
            'date_of_usage'           => now()->addDay()->toDateString(),
            'time_start'              => '08:00:00',
            'time_end'                => '12:00:00',
            'assigned_units'          => [], // NO unique units assigned yet!
            'status'                  => 'approved',
        ]);

        $mail = new BookingStatusUpdateMail('equipment', $borrow, 'approved');
        $envelope = $mail->envelope();
        $html = $mail->render();

        // 1. Subject should NOT have & GATE PASS
        $this->assertStringNotContainsString('& GATE PASS', $envelope->subject);
        $this->assertStringContainsString('READY FOR PICKUP: Equipment Borrowing Approved', $envelope->subject);

        // 2. HTML should NOT have Gate Pass card or Gate Pass header
        $this->assertStringNotContainsString('OFFICIAL CAMPUS GATE PASS', $html);
        $this->assertStringNotContainsString('<div class="gatepass-card">', $html);
        $this->assertStringNotContainsString('Equipment Borrowing Approved &amp; Campus Gate Pass', $html);

        // 3. HTML should show clear approval and counter pickup instructions
        $this->assertStringContainsString('Equipment Borrowing Approved', $html);
        $this->assertStringContainsString('AVR Custodial Counter', $html);
        $this->assertStringContainsString('Official Campus Gate Pass with individual equipment serial numbers will be issued once physical units are scanned', $html);
    }

    public function test_equipment_borrowing_approved_with_units_shows_gatepass_and_serials(): void
    {
        $eqType = EquipmentType::create([
            'name'        => 'Wireless Microphone System',
            'eq_name'     => 'Wireless Mic',
            'status'      => 'available',
        ]);

        $childUnit = EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'brand'             => 'Shure',
            'model'             => 'Transceiver Unit',
            'serial_number'     => 'SN-CHILD-8822',
            'status'            => 'available',
        ]);

        $parentUnit = EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'brand'             => 'Sony',
            'model'             => 'VPL-DX221',
            'serial_number'     => 'SN-PARENT-7711',
            'built_in_units'    => [(int)$childUnit->id],
            'status'            => 'borrowed',
        ]);

        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'EQ-202610-APP02',
            'reservation_type' => 'equipment_borrow',
            'reservation_id'   => 11,
            'status'           => 'approved',
        ]);

        $borrow = EquipmentBorrow::create([
            'tracking_number_id'      => $tracking->id,
            'submission_channel'      => 'online_self',
            'first_name'              => 'Angie',
            'last_name'               => 'Petilo',
            'filer_name'              => 'Angie Petilo',
            'email_address'           => 'angie.petilo@urios.edu.ph',
            'contact_number'          => '09123456789',
            'classification'          => 'student',
            'requestor_identity_type' => 'student',
            'program_office'          => 'College of Computing Studies',
            'purpose'                 => 'Class Capstone Presentation',
            'date_of_usage'           => now()->addDay()->toDateString(),
            'time_start'              => '08:00:00',
            'time_end'                => '12:00:00',
            'assigned_units'          => [$parentUnit->barcode],
            'status'                  => 'approved',
        ]);

        $mail = new BookingStatusUpdateMail('equipment', $borrow, 'approved');
        $envelope = $mail->envelope();
        $html = $mail->render();

        // 1. Subject should include & GATE PASS
        $this->assertStringContainsString('READY FOR PICKUP & GATE PASS', $envelope->subject);

        // 2. HTML should have Gate Pass card
        $this->assertStringContainsString('OFFICIAL CAMPUS GATE PASS', $html);

        // 3. Parent unit serial should be displayed
        $this->assertStringContainsString('SN-PARENT-7711', $html);

        // 4. Built-in child unit should display with its serial number
        $this->assertStringContainsString('SN: SN-CHILD-8822', $html);

        // 5. Title must NOT contain double-escaped literal &amp;amp;
        $this->assertStringNotContainsString('&amp;amp;', $html);
    }

    public function test_venue_reminder_service_dispatches_when_window_approaches(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $tracking = TrackingNumber::forceCreate([
            'reference_code'   => 'VN-REMIND-01',
            'reservation_type' => 'venue_booking',
            'reservation_id'   => 1,
            'status'           => 'approved',
        ]);

        $booking = VenueBooking::create([
            'tracking_number_id' => $tracking->id,
            'venue_id'           => $venue->id,
            'filer_name'         => 'Prof. Santos',
            'email_address'      => 'santos@fsuu.edu.ph',
            'contact_number'     => '09170001122',
            'classification'     => 'faculty',
            'purpose'            => 'Faculty Research Colloquium',
            'no_of_person'       => 45,
            'date_of_usage'      => now()->toDateString(),
            'time_start'         => now()->addMinutes(45)->format('H:i:s'),
            'time_end'           => now()->addHours(2)->format('H:i:s'),
            'status'             => 'approved',
        ]);

        $service = app(VenueReminderService::class);
        $res = $service->processReminders(120);

        $this->assertContains('VN-REMIND-01', $res['venue_reminded']);
    }
}
