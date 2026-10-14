<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicBookingCriticalJourneyTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_venue_booking_critical_journey(): void
    {
        // 1. Setup Venue and Equipment
        $venue = Venue::create([
            'name'         => 'AVR Test Auditorium',
            'location'     => 'Main Campus Building 3F',
            'capacity'     => 150,
            'min_capacity' => 10,
            'max_capacity' => 150,
            'status'       => 'available',
        ]);

        $eqType = EquipmentType::create([
            'eq_name'   => 'Wireless Mic System',
            'status'    => 'available',
            'is_public' => true,
        ]);

        $unit = EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'seq_no'            => 1,
            'barcode'           => 'BC-MIC-001',
            'serial_number'     => 'SN-MIC-001',
            'status'            => 'available',
            'condition'         => 'good',
        ]);

        // 2. Client checks public catalog endpoints
        $venuesRes = $this->getJson('/api/public/venues');
        $venuesRes->assertStatus(200);
        $this->assertNotEmpty($venuesRes->json());

        $equipRes = $this->getJson('/api/public/equipment-types');
        $equipRes->assertStatus(200);
        $this->assertNotEmpty($equipRes->json());

        // 3. Client runs duplicate pre-check
        $dupCheckRes = $this->postJson('/api/public/venue-bookings/check-duplicate', [
            'name'          => 'Maria Santos',
            'email'         => 'maria.santos@fsuu.edu.ph',
            'contact'       => '09171234567',
            'venue_id'      => $venue->id,
            'date_of_usage' => '2026-11-20',
        ]);
        $dupCheckRes->assertStatus(200);
        $this->assertFalse($dupCheckRes->json('duplicate'));
        $this->assertNull($dupCheckRes->json('details'));

        \App\Models\VerificationPinSetting::query()->update([
            'is_enabled'         => false,
            'venue_verify_email' => false,
            'venue_verify_phone' => false,
        ]);

        \App\Models\EmailVerification::create([
            'email'       => 'maria.santos@fsuu.edu.ph',
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        // 4. Client submits public venue booking request (lead time >= 3 days)
        $bookingPayload = [
            'venue_id'                 => $venue->id,
            'first_name'               => 'Maria',
            'last_name'                => 'Santos',
            'requestor_name'           => 'Maria Santos',
            'requestor_email'          => 'maria.santos@fsuu.edu.ph',
            'requestor_contact_number' => '09171234567',
            'filer_name'               => 'Maria Santos',
            'email_address'            => 'maria.santos@fsuu.edu.ph',
            'contact_number'           => '09171234567',
            'classification'           => 'student',
            'requestor_identity_type'  => 'student',
            'program_office'           => 'CS-IT',
            'purpose'                  => 'Tech Innovation Seminar',
            'number_of_persons'        => 50,
            'no_of_person'             => 50,
            'date_of_usage'            => '2026-11-20',
            'time_start'               => '09:00:00',
            'time_end'                 => '12:00:00',
            'equipment_notes'          => 'Wireless Mic System (Qty: 1)',
        ];

        $submitRes = $this->postJson('/api/public/venue-bookings', $bookingPayload);
        $submitRes->assertStatus(201);
        
        $refCode = is_string($submitRes->json('reference_code')) 
            ? $submitRes->json('reference_code') 
            : ($submitRes->json('tracking_number.reference_code') ?? $submitRes->json('tracking_number'));
        $this->assertNotEmpty($refCode, 'Response must return a tracking reference code');

        // 5. Client checks status via Public Tracking endpoint
        $trackRes = $this->postJson('/api/public/track', [
            'reference_code' => $refCode,
        ]);
        $trackRes->assertStatus(200);
        $this->assertEquals('pending', strtolower($trackRes->json('status')));
        $this->assertEquals('Tech Innovation Seminar', $trackRes->json('purpose'));

        // 6. Admin logs in and inspects the booking
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $admin = User::create([
            'name'     => 'Staff Admin',
            'email'    => 'staff.admin@fsuu.edu.ph',
            'password' => bcrypt('secret123'),
            'role_id'  => $adminRole->id,
        ]);

        $bookingId = $submitRes->json('id') ?? $submitRes->json('booking.id');
        $this->assertNotNull($bookingId);

        // Admin fetches the venue booking via authenticated route
        $adminFetchRes = $this->actingAs($admin)->getJson("/api/avr-venue-bookings/{$bookingId}");
        $adminFetchRes->assertStatus(200);

        // 7. Admin approves the booking and assigns physical unit
        $approveRes = $this->actingAs($admin)->postJson("/api/avr-venue-bookings/{$bookingId}/approve", [
            'status'         => 'approved',
            'assigned_units' => [$unit->barcode],
        ]);
        $approveRes->assertStatus(200);

        // 8. Re-check via Public Track endpoint: must now show approved
        $reTrackRes = $this->postJson('/api/public/track', [
            'reference_code' => $refCode,
        ]);
        $reTrackRes->assertStatus(200);
        $this->assertEquals('approved', strtolower($reTrackRes->json('status')));
    }
}
