<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\RateLimiter;

class RateLimitingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login:127.0.0.1');
        RateLimiter::clear('otp:127.0.0.1');
        RateLimiter::clear('public-submissions:127.0.0.1');
    }

    public function test_login_endpoint_is_throttled_after_exceeding_limit(): void
    {
        // Limit is 5 attempts per minute
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'invalid@test.com',
                'password' => 'wrongpass',
            ]);
            $this->assertNotEquals(429, $response->getStatusCode());
        }

        // 6th attempt should be blocked by application firewall with 429 Too Many Requests
        $blockedResponse = $this->postJson('/api/login', [
            'email' => 'invalid@test.com',
            'password' => 'wrongpass',
        ]);

        $blockedResponse->assertStatus(429);
        $this->assertStringContainsString('Too many login attempts', $blockedResponse->json('message'));
    }

    public function test_otp_endpoint_is_throttled_after_exceeding_limit(): void
    {
        // Limit is 5 OTP requests per minute
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/public/send-otp', [
                'email' => 'student@urios.edu.ph',
            ]);
            $this->assertNotEquals(429, $response->getStatusCode());
        }

        // 6th attempt must be blocked
        $blockedResponse = $this->postJson('/api/public/send-otp', [
            'email' => 'student@urios.edu.ph',
        ]);

        $blockedResponse->assertStatus(429);
        $this->assertStringContainsString('Too many OTP requests', $blockedResponse->json('message'));
    }
}
