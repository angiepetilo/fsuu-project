<?php

namespace Tests\Feature;

use App\Rules\ActiveDeliverableEmail;
use App\Services\AbstractEmailValidationService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DisposableEmailPreventionTest extends TestCase
{
    use RefreshDatabase;

    protected AbstractEmailValidationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(AbstractEmailValidationService::class);
    }

    /**
     * Test that institutional emails (@urios.edu.ph, @fsuu.edu.ph) are verified when name-based.
     */
    public function test_institutional_emails_pass_verification(): void
    {
        $institutionalEmails = [
            'student@urios.edu.ph',
            'faculty@fsuu.edu.ph',
            'ADMIN@URIOS.EDU.PH',
            'angie.petilo@urios.edu.ph',
        ];

        foreach ($institutionalEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email]);

            $response->assertStatus(200)
                ->assertJson([
                    'valid'         => true,
                    'deliverability'=> 'DELIVERABLE',
                    'is_disposable' => false,
                ]);
        }
    }

    /**
     * Test that institutional emails containing numbers (e.g. 202100452@urios.edu.ph) are rejected.
     */
    public function test_institutional_emails_with_numbers_are_rejected(): void
    {
        $invalidNumberedEmails = [
            '202100452@urios.edu.ph',
            'student123@urios.edu.ph',
            '202212345@fsuu.edu.ph',
            'john.doe1@urios.edu.ph',
        ];

        foreach ($invalidNumberedEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email]);

            $response->assertStatus(422)
                ->assertJson([
                    'valid'          => false,
                    'deliverability' => 'UNDELIVERABLE',
                ]);
        }
    }

    /**
     * Test that major and mirror disposable email providers (from the 75,000+ dataset) are rejected.
     */
    public function test_75k_disposable_email_domains_are_strictly_blocked(): void
    {
        $disposableEmails = [
            'spammer@temp-mail.org',
            'throwaway@mailinator.com',
            'burner@10minutemail.com',
            'bot@guerrillamail.com',
            'fake@yopmail.com',
            'junk@trashmail.com',
            'test@sharklasers.com',
            'anon@dispostable.com',
            'random@burnermail.io',
        ];

        foreach ($disposableEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email]);

            $response->assertStatus(422)
                ->assertJson([
                    'valid'         => false,
                    'deliverability'=> 'UNDELIVERABLE',
                    'is_disposable' => true,
                ]);

            $this->assertStringContainsString('Disposable or temporary email addresses', $response->json('message'));
        }
    }

    /**
     * Test that keyboard-mashed and randomized fake emails are blocked even on valid domains like @gmail.com.
     */
    public function test_randomized_and_keyboard_mashed_emails_are_rejected(): void
    {
        $gibberishEmails = [
            'asdadadsa@gmail.com',
            'asdfghjkl@gmail.com',
            'aaaaaa@gmail.com',
            'dfghjkl@gmail.com',
        ];

        foreach ($gibberishEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email, 'is_portal' => true]);

            $response->assertStatus(422)
                ->assertJson([
                    'valid'         => false,
                    'deliverability'=> 'UNDELIVERABLE',
                    'source'        => 'gibberish_detector',
                ]);

            $this->assertStringContainsString('randomized or fake', $response->json('message'));
        }
    }

    /**
     * Test that public reservations strictly reject personal Gmail and require @urios.edu.ph.
     */
    public function test_public_reservations_reject_personal_gmail_and_require_urios_email(): void
    {
        $nonUniversityEmails = [
            'john.doe@gmail.com',
            'jane.doe@yahoo.com',
            'test.user@outlook.com',
        ];

        foreach ($nonUniversityEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email, 'is_portal' => false]);

            $response->assertStatus(422)
                ->assertJson([
                    'valid'  => false,
                    'source' => 'domain_restriction',
                ]);

            $this->assertStringContainsString('Public reservations strictly require an official university email', $response->json('message'));
        }
    }

    /**
     * Test that portal reservations allow both @urios.edu.ph and personal Gmail (@gmail.com).
     */
    public function test_portal_reservations_allow_both_urios_email_and_personal_gmail(): void
    {
        \Illuminate\Support\Facades\Http::fake([
            'https://*abstractapi.com/*' => \Illuminate\Support\Facades\Http::response([
                'deliverability' => 'DELIVERABLE',
                'is_disposable_email' => ['value' => false],
                'is_smtp_valid' => ['value' => true],
                'is_mx_found' => ['value' => true],
                'quality_score' => 0.95,
            ], 200),
        ]);

        // 1. Institutional email passes in portal
        $resInstitutional = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'faculty.member@urios.edu.ph',
            'is_portal' => true,
        ]);
        $resInstitutional->assertStatus(200)->assertJson(['valid' => true, 'source' => 'institutional']);

        // 2. Reputable non-gibberish Gmail passes in portal
        $resGmail = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'juan.delacruz@gmail.com',
            'is_portal' => true,
        ]);
        $resGmail->assertStatus(200)->assertJson(['valid' => true]);

        // 3. Other third-party non-Gmail domains (e.g. Yahoo) are still rejected in portal
        $resYahoo = $this->postJson('/api/public/verify-email-active', [
            'email'     => 'juan.delacruz@yahoo.com',
            'is_portal' => true,
        ]);
        $resYahoo->assertStatus(422)->assertJson(['valid' => false, 'source' => 'domain_restriction']);
        $this->assertStringContainsString('Portal reservations only accept official university emails', $resYahoo->json('message'));
    }

    /**
     * Test that invalid or malformed email syntax is blocked.
     */
    public function test_invalid_syntax_is_rejected(): void
    {
        $invalidEmails = [
            'not-an-email',
            'missing-domain@',
            '@missing-user.com',
            'spaces in@email.com',
        ];

        foreach ($invalidEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email]);
            $response->assertStatus(422)
                ->assertJson(['valid' => false]);
        }
    }

    /**
     * Test that non-existent domains without MX records are rejected.
     */
    public function test_non_existent_domains_are_rejected(): void
    {
        $fakeDomainEmail = 'randomuser@domainthatreallydoesnotexist999888777.com';

        $response = $this->postJson('/api/public/verify-email-active', ['email' => $fakeDomainEmail]);

        $response->assertStatus(422)
            ->assertJson([
                'valid' => false,
                'deliverability' => 'UNDELIVERABLE',
            ]);
    }

    /**
     * Test that the ActiveDeliverableEmail validation rule blocks disposable emails.
     */
    public function test_active_deliverable_email_rule_enforces_disposable_block(): void
    {
        $validatorDisposable = Validator::make(
            ['email' => 'hacker@temp-mail.org'],
            ['email' => ['required', 'email', new ActiveDeliverableEmail]]
        );
        $this->assertTrue($validatorDisposable->fails());
        $this->assertStringContainsString('Disposable or temporary email', $validatorDisposable->errors()->first('email'));

        $validatorInstitutional = Validator::make(
            ['email' => 'student@urios.edu.ph'],
            ['email' => ['required', 'email', new ActiveDeliverableEmail]]
        );
        $this->assertTrue($validatorInstitutional->passes());
    }

    /**
     * Test that OTP request endpoint (/api/public/send-otp) blocks disposable email.
     */
    public function test_send_otp_blocks_disposable_email(): void
    {
        $response = $this->postJson('/api/public/send-otp', [
            'email'            => 'throwaway@temp-mail.org',
            'channel'          => 'email',
            'reservation_type' => 'venue',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Disposable or temporary email', json_encode($response->json()));
    }
}
