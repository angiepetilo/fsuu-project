<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiErrorContractAndCorsTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_returns_standardized_error_contract(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401);
        $response->assertJson([
            'success'    => false,
            'error_code' => 'UNAUTHENTICATED',
        ]);
        $this->assertArrayHasKey('message', $response->json());
    }

    public function test_not_found_route_returns_standardized_error_contract(): void
    {
        $response = $this->getJson('/api/non-existent-endpoint-test');

        $response->assertStatus(404);
        $response->assertJson([
            'success'    => false,
            'error_code' => 'NOT_FOUND',
        ]);
    }

    public function test_validation_error_returns_standardized_error_contract(): void
    {
        // Attempting to login without email/password triggers validation failure
        $response = $this->postJson('/api/login', []);

        $response->assertStatus(422);
        $response->assertJson([
            'success'    => false,
            'error_code' => 'VALIDATION_FAILED',
        ]);
        $this->assertArrayHasKey('errors', $response->json());
    }

    public function test_cors_allows_configured_trusted_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:5173',
        ])->getJson('/api/health');

        $response->assertStatus(200);
        $this->assertEquals('http://localhost:5173', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertEquals('true', $response->headers->get('Access-Control-Allow-Credentials'));
    }

    public function test_cors_does_not_trust_arbitrary_untrusted_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://malicious-attacker-website.com',
        ])->getJson('/api/health');

        $response->assertStatus(200);
        // Untrusted origin should NOT receive credentials allowed
        $this->assertNotEquals('true', $response->headers->get('Access-Control-Allow-Credentials'));
        $this->assertNotEquals('https://malicious-attacker-website.com', $response->headers->get('Access-Control-Allow-Origin'));
    }
}
