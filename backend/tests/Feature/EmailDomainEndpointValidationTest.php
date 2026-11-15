<?php

namespace Tests\Feature;

use App\Models\EmailVerification;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\VerificationPinSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmailDomainEndpointValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure Verification PIN and OTP settings are enabled
        VerificationPinSetting::create([
            'is_enabled'             => true,
            'venue_verify_email'     => true,
            'venue_verify_phone'     => false,
            'equipment_verify_email' => true,
            'equipment_verify_phone' => false,
        ]);

        // Mock Abstract API responses for valid deliverable personal Gmail tests
        Http::fake([
            'https://*abstractapi.com/*' => Http::response([
                'deliverability'      => 'DELIVERABLE',
                'is_disposable_email' => ['value' => false],
                'is_smtp_valid'       => ['value' => true],
                'is_mx_found'         => ['value' => true],
                'quality_score'       => 0.95,
            ], 200),
        ]);
    }

    // =========================================================================
    // 1. ENDPOINT: POST /api/public/verify-email-active
    // =========================================================================

    public function test_verify_email_endpoint_public_accepts_urios_email(): void
    {
        $response = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'juan.delacruz@urios.edu.ph',
            'is_portal' => false,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid'          => true,
                'email'          => 'juan.delacruz@urios.edu.ph',
                'domain'         => 'urios.edu.ph',
                'deliverability' => 'DELIVERABLE',
                'source'         => 'institutional',
            ]);
    }

    public function test_verify_email_endpoint_public_rejects_numbered_urios_email(): void
    {
        $response = $this->postJson('/api/public/verify-email-active', [
            'email'     => '202100452@urios.edu.ph',
            'is_portal' => false,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'valid'  => false,
                'source' => 'institutional_policy',
            ]);

        $this->assertStringContainsString('Institutional email must be your official name-based university email', $response->json('message'));
    }

    public function test_verify_email_endpoint_public_rejects_personal_gmail(): void
    {
        $response = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'juan.delacruz@gmail.com',
            'is_portal' => false,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'valid'  => false,
                'source' => 'domain_restriction',
            ]);

        $this->assertStringContainsString('Public reservations strictly require an official university email (@urios.edu.ph)', $response->json('message'));
    }

    public function test_verify_email_endpoint_public_rejects_yahoo_and_disposable(): void
    {
        // Yahoo
        $resYahoo = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'juan.delacruz@yahoo.com',
            'is_portal' => false,
        ]);
        $resYahoo->assertStatus(422)->assertJson(['valid' => false, 'source' => 'domain_restriction']);

        // Temp-mail
        $resTemp = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'spammer@temp-mail.org',
            'is_portal' => false,
        ]);
        $resTemp->assertStatus(422)->assertJson(['valid' => false, 'is_disposable' => true]);
    }

    public function test_verify_email_endpoint_portal_accepts_urios_email(): void
    {
        $response = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'maria.clara@urios.edu.ph',
            'is_portal' => true,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid'  => true,
                'source' => 'institutional',
            ]);
    }

    public function test_verify_email_endpoint_portal_accepts_personal_gmail(): void
    {
        $response = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'maria.clara@gmail.com',
            'is_portal' => true,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid'          => true,
                'domain'         => 'gmail.com',
                'deliverability' => 'DELIVERABLE',
            ]);
    }

    public function test_verify_email_endpoint_portal_rejects_other_domains(): void
    {
        $response = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'maria.clara@yahoo.com',
            'is_portal' => true,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'valid'  => false,
                'source' => 'domain_restriction',
            ]);

        $this->assertStringContainsString('Portal reservations only accept official university emails (@urios.edu.ph) or personal Gmail (@gmail.com)', $response->json('message'));
    }

    // =========================================================================
    // 2. ENDPOINT: POST /api/public/send-otp
    // =========================================================================

    public function test_send_otp_endpoint_public_accepts_urios_email(): void
    {
        $response = $this->postJson('/api/public/send-otp', [
            'email'            => 'professor.andres@urios.edu.ph',
            'channel'          => 'email',
            'reservation_type' => 'venue',
            'is_portal'        => false,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'channel' => 'email',
            ]);
    }

    public function test_send_otp_endpoint_public_rejects_personal_gmail(): void
    {
        $response = $this->postJson('/api/public/send-otp', [
            'email'            => 'andres.bonifacio@gmail.com',
            'channel'          => 'email',
            'reservation_type' => 'venue',
            'is_portal'        => false,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Public reservations strictly require an official university email (@urios.edu.ph)', json_encode($response->json()));
    }

    public function test_send_otp_endpoint_portal_accepts_personal_gmail(): void
    {
        $response = $this->postJson('/api/public/send-otp', [
            'email'            => 'andres.bonifacio@gmail.com',
            'channel'          => 'email',
            'reservation_type' => 'venue',
            'is_portal'        => true,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'channel' => 'email',
            ]);
    }

    // =========================================================================
    // 3. ENDPOINT: POST /api/public/avr-venue-bookings
    // =========================================================================

    public function test_venue_booking_endpoint_public_accepts_urios_email(): void
    {
        $venue = Venue::create([
            'name'         => 'Test Convention Hall',
            'location'     => 'Main Campus 2F',
            'capacity'     => 100,
            'min_capacity' => 10,
            'max_capacity' => 100,
            'status'       => 'available',
        ]);

        $email = 'pedro.penduko@urios.edu.ph';
        // Mark verified in DB for OTP requirement
        EmailVerification::create([
            'email'       => $email,
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        $dateOfUsage = now()->addDays(7)->format('Y-m-d');

        $payload = [
            'venue_id'                 => $venue->id,
            'first_name'               => 'Pedro',
            'last_name'                => 'Penduko',
            'requestor_name'           => 'Pedro Penduko',
            'requestor_email'          => $email,
            'requestor_contact_number' => '09181234567',
            'purpose'                  => 'Official University Seminar',
            'date_of_usage'            => $dateOfUsage,
            'time_start'               => '09:00',
            'time_end'                 => '12:00',
            'is_portal'                => false,
        ];

        $response = $this->postJson('/api/public/avr-venue-bookings', $payload);
        $response->assertStatus(201);
    }

    public function test_venue_booking_endpoint_public_rejects_personal_gmail(): void
    {
        $venue = Venue::create([
            'name'         => 'Test Gymnasium',
            'location'     => 'Morelos Campus',
            'capacity'     => 500,
            'min_capacity' => 50,
            'max_capacity' => 500,
            'status'       => 'available',
        ]);

        $email = 'pedro.penduko@gmail.com';
        EmailVerification::create([
            'email'       => $email,
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        $dateOfUsage = now()->addDays(7)->format('Y-m-d');

        $payload = [
            'venue_id'                 => $venue->id,
            'first_name'               => 'Pedro',
            'last_name'                => 'Penduko',
            'requestor_name'           => 'Pedro Penduko',
            'requestor_email'          => $email,
            'requestor_contact_number' => '09181234567',
            'purpose'                  => 'Community Event',
            'date_of_usage'            => $dateOfUsage,
            'time_start'               => '09:00',
            'time_end'                 => '12:00',
            'is_portal'                => false,
        ];

        $response = $this->postJson('/api/public/avr-venue-bookings', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['requestor_email']);

        $this->assertStringContainsString('Public reservations strictly require an official university email (@urios.edu.ph)', json_encode($response->json()));
    }

    public function test_venue_booking_endpoint_portal_accepts_personal_gmail(): void
    {
        $venue = Venue::create([
            'name'         => 'Test Amphitheater',
            'location'     => 'Main Campus 4F',
            'capacity'     => 80,
            'min_capacity' => 10,
            'max_capacity' => 80,
            'status'       => 'available',
        ]);

        $email = 'pedro.penduko@gmail.com';
        EmailVerification::create([
            'email'       => $email,
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        $dateOfUsage = now()->addDays(7)->format('Y-m-d');

        $payload = [
            'venue_id'                 => $venue->id,
            'first_name'               => 'Pedro',
            'last_name'                => 'Penduko',
            'requestor_name'           => 'Pedro Penduko',
            'requestor_email'          => $email,
            'requestor_contact_number' => '09181234567',
            'purpose'                  => 'Portal Staff Booking',
            'date_of_usage'            => $dateOfUsage,
            'time_start'               => '09:00',
            'time_end'                 => '12:00',
            'is_portal'                => true,
        ];

        $response = $this->postJson('/api/public/avr-venue-bookings', $payload);
        $response->assertStatus(201);
    }

    // =========================================================================
    // 4. ENDPOINT: POST /api/public/avr-equipment-borrowings
    // =========================================================================

    public function test_equipment_borrowing_endpoint_public_accepts_urios_email(): void
    {
        $eqType = EquipmentType::create([
            'eq_name'   => 'Portable Projector',
            'status'    => 'available',
            'is_public' => true,
        ]);

        EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'seq_no'            => 1,
            'barcode'           => 'BC-PRJ-001',
            'serial_number'     => 'SN-PRJ-001',
            'status'            => 'available',
            'condition'         => 'good',
        ]);

        $email = 'gabriela.silang@urios.edu.ph';
        EmailVerification::create([
            'email'       => $email,
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        $payload = [
            'first_name'               => 'Gabriela',
            'last_name'                => 'Silang',
            'requestor_name'           => 'Gabriela Silang',
            'requestor_email'          => $email,
            'requestor_contact_number' => '09191234567',
            'requestor_program_office' => 'CAS',
            'requestor_identity_type'  => 'faculty',
            'purpose'                  => 'Class presentation',
            'place_of_use'             => 'Room 302',
            'start_datetime'           => now()->addDays(2)->setTime(9, 0)->format('Y-m-d H:i:s'),
            'end_datetime'             => now()->addDays(2)->setTime(12, 0)->format('Y-m-d H:i:s'),
            'items'                    => [
                ['equipment_type_id' => $eqType->id, 'quantity_requested' => 1],
            ],
            'is_portal'                => false,
        ];

        $response = $this->postJson('/api/public/avr-equipment-borrowings', $payload);
        $response->assertStatus(201);
    }

    public function test_equipment_borrowing_endpoint_public_rejects_personal_gmail(): void
    {
        $eqType = EquipmentType::create([
            'eq_name'   => 'Presenter Clicker',
            'status'    => 'available',
            'is_public' => true,
        ]);

        EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'seq_no'            => 1,
            'barcode'           => 'BC-CLK-001',
            'serial_number'     => 'SN-CLK-001',
            'status'            => 'available',
            'condition'         => 'good',
        ]);

        $email = 'gabriela.silang@gmail.com';
        EmailVerification::create([
            'email'       => $email,
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        $payload = [
            'first_name'               => 'Gabriela',
            'last_name'                => 'Silang',
            'requestor_name'           => 'Gabriela Silang',
            'requestor_email'          => $email,
            'requestor_contact_number' => '09191234567',
            'requestor_program_office' => 'CAS',
            'requestor_identity_type'  => 'student',
            'purpose'                  => 'Student report',
            'place_of_use'             => 'Room 201',
            'start_datetime'           => now()->addDays(2)->setTime(9, 0)->format('Y-m-d H:i:s'),
            'end_datetime'             => now()->addDays(2)->setTime(12, 0)->format('Y-m-d H:i:s'),
            'items'                    => [
                ['equipment_type_id' => $eqType->id, 'quantity_requested' => 1],
            ],
            'is_portal'                => false,
        ];

        $response = $this->postJson('/api/public/avr-equipment-borrowings', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['requestor_email']);

        $this->assertStringContainsString('Public reservations strictly require an official university email (@urios.edu.ph)', json_encode($response->json()));
    }

    public function test_equipment_borrowing_endpoint_portal_accepts_personal_gmail(): void
    {
        $eqType = EquipmentType::create([
            'eq_name'   => 'Document Camera',
            'status'    => 'available',
            'is_public' => true,
        ]);

        EquipmentUnit::create([
            'equipment_type_id' => $eqType->id,
            'seq_no'            => 1,
            'barcode'           => 'BC-CAM-001',
            'serial_number'     => 'SN-CAM-001',
            'status'            => 'available',
            'condition'         => 'good',
        ]);

        $email = 'gabriela.silang@gmail.com';
        EmailVerification::create([
            'email'       => $email,
            'channel'     => 'email',
            'otp_code'    => '123456',
            'verified_at' => now(),
            'expires_at'  => now()->addHour(),
        ]);

        $payload = [
            'first_name'               => 'Gabriela',
            'last_name'                => 'Silang',
            'requestor_name'           => 'Gabriela Silang',
            'requestor_email'          => $email,
            'requestor_contact_number' => '09191234567',
            'requestor_program_office' => 'CAS',
            'requestor_identity_type'  => 'faculty',
            'purpose'                  => 'Portal Equipment Requisition',
            'place_of_use'             => 'Room 401',
            'start_datetime'           => now()->addDays(2)->setTime(9, 0)->format('Y-m-d H:i:s'),
            'end_datetime'             => now()->addDays(2)->setTime(12, 0)->format('Y-m-d H:i:s'),
            'items'                    => [
                ['equipment_type_id' => $eqType->id, 'quantity_requested' => 1],
            ],
            'is_portal'                => true,
        ];

        $response = $this->postJson('/api/public/avr-equipment-borrowings', $payload);
        $response->assertStatus(201);
    }
}
