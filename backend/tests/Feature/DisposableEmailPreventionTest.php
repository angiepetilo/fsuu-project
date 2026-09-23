<?php

namespace Tests\Feature;

use App\Rules\ActiveDeliverableEmail;
use App\Services\AbstractEmailValidationService;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class DisposableEmailPreventionTest extends TestCase
{
    protected AbstractEmailValidationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(AbstractEmailValidationService::class);
    }

    /**
     * Test that institutional emails (@urios.edu.ph, @fsuu.edu.ph) are always verified.
     */
    public function test_institutional_emails_pass_verification(): void
    {
        $institutionalEmails = [
            'student@urios.edu.ph',
            'faculty@fsuu.edu.ph',
            'ADMIN@URIOS.EDU.PH',
        ];

        foreach ($institutionalEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email]);

            $response->assertStatus(200)
                ->assertJson([
                    'valid'         => true,
                    'deliverability'=> 'DELIVERABLE',
                    'is_disposable' => false,
                    'source'        => 'institutional',
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
            'qwertyuiop@yahoo.com',
            'zxcvbnm@outlook.com',
            'aaaaaa@gmail.com',
            'dfghjkl@gmail.com',
        ];

        foreach ($gibberishEmails as $email) {
            $response = $this->postJson('/api/public/verify-email-active', ['email' => $email]);

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
