<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AbstractEmailValidationService
{
    /**
     * Fallback prominent disposable email domains in case disk storage is unavailable.
     */
    protected static array $coreDisposableDomains = [
        'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
        'trashmail.com', 'yopmail.com', 'sharklasers.com', 'dispostable.com',
        'getairmail.com', 'fakemailgenerator.com', 'throwawaymail.com', 'generator.email',
        'temp-mail.org', 'tempmailo.com', 'burnermail.io', 'nada.ltd', 'mohmal.com',
        'crazymailing.com', 'emailondeck.com', 'temp-mail.io', 'mytemp.email'
    ];

    /**
     * Cached in-memory lookup map for 75,000+ disposable domains.
     */
    protected static ?array $disposableMapCache = null;

    /**
     * Check if a domain belongs to a disposable/temporary email provider (using the 75k+ dataset).
     */
    public static function isDisposableDomain(string $domain): bool
    {
        $domain = strtolower(trim($domain));
        if (empty($domain)) {
            return false;
        }

        // 1. Fast in-memory map check
        if (self::$disposableMapCache !== null) {
            return isset(self::$disposableMapCache[$domain]);
        }

        // 2. Fetch from Cache or load file
        $map = Cache::remember('disposable_email_domains_map', 86400 * 7, function () {
            $filePath = storage_path('app/disposable_domains.txt');
            $domains = [];

            if (file_exists($filePath)) {
                $content = @file_get_contents($filePath);
                if ($content) {
                    $lines = preg_split("/\r\n|\n|\r/", $content);
                    foreach ($lines as $line) {
                        $d = strtolower(trim($line));
                        if (!empty($d)) {
                            $domains[$d] = true;
                        }
                    }
                }
            }

            // Always ensure core fallback domains are present
            foreach (self::$coreDisposableDomains as $core) {
                $domains[strtolower(trim($core))] = true;
            }

            return $domains;
        });

        self::$disposableMapCache = $map;
        return isset(self::$disposableMapCache[$domain]);
    }

    /**
     * Perform comprehensive email verification:
     * 1. RFC Syntax check
     * 2. Institutional domain bypass (@urios.edu.ph, @fsuu.edu.ph)
     * 3. 75,000+ Disposable email domain check (temp-mail, mailinator, etc.)
     * 4. DNS MX lookup pre-check
     * 5. Abstract API deep validation (SMTP deliverability, fake/randomized mailbox detection, typo autocorrect)
     */
    public function validate(string $email): array
    {
        $email = trim(strtolower($email));

        // 1. Basic Format validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                'valid'          => false,
                'email'          => $email,
                'domain'         => '',
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.0,
                'message'        => 'Please enter a valid email address.',
                'source'         => 'syntax'
            ];
        }

        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return [
                'valid'          => false,
                'email'          => $email,
                'domain'         => '',
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.0,
                'message'        => 'Invalid email format.',
                'source'         => 'syntax'
            ];
        }

        $user = strtolower(trim($parts[0]));
        $domain = strtolower(trim($parts[1]));
        $isInstitutional = in_array($domain, ['urios.edu.ph', 'fsuu.edu.ph'], true);

        // 2. Official institutional emails (@urios.edu.ph, @fsuu.edu.ph) contain NO numbers (e.g. student IDs like 202100452@urios.edu.ph are invalid)
        if ($isInstitutional && preg_match('/[0-9]/', $user)) {
            return [
                'valid'          => false,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.0,
                'message'        => 'Official institutional emails (@urios.edu.ph) do not contain numbers (e.g., student ID numbers like 202100452@urios.edu.ph are not valid). Please use your official name-based email (e.g., firstname.lastname@urios.edu.ph).',
                'source'         => 'institutional_no_numbers_rule'
            ];
        }

        // 3. Detect keyboard-mashed, randomized, or gibberish usernames (e.g. aasdw, asdasd, asdfghjkl)
        if (self::isRandomOrGibberishUsername($user)) {
            return [
                'valid'          => false,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.0,
                'message'        => 'This email address appears to be randomized or fake (keyboard mash detected). Please provide a real ' . ($isInstitutional ? 'official university' : 'personal') . ' email.',
                'source'         => 'gibberish_detector'
            ];
        }

        // 4. 75,000+ Disposable domain check (temp-mail, mailinator, etc.)
        if (self::isDisposableDomain($domain)) {
            return [
                'valid'          => false,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => true,
                'autocorrect'    => null,
                'quality_score'  => 0.0,
                'message'        => 'Disposable or temporary email addresses (like temp-mail) are not accepted. Please use an active personal email.',
                'source'         => 'disposable_blacklist_75k'
            ];
        }

        // Local dummy test domains allow bypass
        if ($domain === 'localhost' || str_ends_with($domain, '.test') || str_ends_with($domain, '.local') || str_ends_with($domain, '.example')) {
            return [
                'valid'          => true,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'DELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 1.0,
                'message'        => 'Local/testing domain verified.',
                'source'         => 'local_bypass'
            ];
        }

        // 4. DNS MX record pre-check
        $hasMx = false;
        try {
            if (function_exists('checkdnsrr')) {
                $hasMx = checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A') || checkdnsrr($domain, 'AAAA');
            } else {
                $records = @dns_get_record($domain, DNS_MX | DNS_A | DNS_AAAA);
                $hasMx = !empty($records);
            }
        } catch (\Throwable $e) {
            $hasMx = true;
        }

        if (!$hasMx) {
            return [
                'valid'          => false,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'UNDELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.0,
                'message'        => "The email domain @{$domain} does not have active mail exchange records.",
                'source'         => 'dns'
            ];
        }

        // 5. Abstract API Deep Check (with cache)
        $apiKey = config('services.abstract.email_validation_key') ?: env('ABSTRACT_EMAIL_API_KEY');
        $apiUrl = config('services.abstract.api_url', 'https://emailvalidation.abstractapi.com/v1/');

        if (empty($apiKey)) {
            // If no API key configured, DNS check is the primary live check
            return [
                'valid'          => true,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'DELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.9,
                'message'        => $isInstitutional ? "Official institutional email verified (@{$domain})." : "Email domain @{$domain} is active and deliverable.",
                'source'         => $isInstitutional ? 'institutional' : 'dns_fallback'
            ];
        }

        $cacheKey = 'abstract_email_' . md5($email);
        $cachedResult = Cache::get($cacheKey);
        if ($cachedResult && is_array($cachedResult)) {
            return $cachedResult;
        }

        // Circuit breaker: If API key was recently flagged as 401 unauthorized or 429 rate-limited, skip remote call
        $circuitBreakerKey = 'abstract_api_circuit_breaker_' . md5($apiKey);
        if (Cache::has($circuitBreakerKey)) {
            return [
                'valid'          => true,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'DELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.85,
                'message'        => $isInstitutional ? "Official institutional email verified (@{$domain})." : "Email domain @{$domain} is active and deliverable.",
                'source'         => $isInstitutional ? 'institutional' : 'dns_fallback'
            ];
        }

        try {
            $response = Http::timeout(4)
                ->withoutVerifying()
                ->get($apiUrl, [
                    'api_key' => $apiKey,
                    'email'   => $email,
                ]);

            if ($response->successful()) {
                $data = $response->json();

                $deliverability = strtoupper($data['deliverability'] ?? 'UNKNOWN');
                $isDisposable = (bool) ($data['is_disposable_email']['value'] ?? false);
                $isSmtpValid = (bool) ($data['is_smtp_valid']['value'] ?? true);
                $isMxFound = (bool) ($data['is_mx_found']['value'] ?? true);
                $qualityScore = (float) ($data['quality_score'] ?? 0.8);
                $autocorrect = !empty($data['autocorrect']) ? trim($data['autocorrect']) : null;

                // Detect disposable
                if ($isDisposable) {
                    $result = [
                        'valid'          => false,
                        'email'          => $email,
                        'domain'         => $domain,
                        'deliverability' => 'UNDELIVERABLE',
                        'is_disposable'  => true,
                        'autocorrect'    => $autocorrect,
                        'quality_score'  => $qualityScore,
                        'message'        => 'Disposable or temporary email addresses are not accepted. Please provide a real email.',
                        'source'         => 'abstract_api'
                    ];
                    Cache::put($cacheKey, $result, 86400 * 14);
                    return $result;
                }

                // Detect undeliverable / fake mailbox
                if ($deliverability === 'UNDELIVERABLE' || !$isSmtpValid || !$isMxFound) {
                    $result = [
                        'valid'          => false,
                        'email'          => $email,
                        'domain'         => $domain,
                        'deliverability' => 'UNDELIVERABLE',
                        'is_disposable'  => false,
                        'autocorrect'    => $autocorrect,
                        'quality_score'  => $qualityScore,
                        'message'        => 'This email address does not exist or cannot receive mail. Please enter an active inbox.',
                        'source'         => 'abstract_api'
                    ];
                    Cache::put($cacheKey, $result, 86400 * 14);
                    return $result;
                }

                // Detect very low quality / suspicious randomized patterns
                if ($qualityScore < 0.20) {
                    $result = [
                        'valid'          => false,
                        'email'          => $email,
                        'domain'         => $domain,
                        'deliverability' => 'RISKY',
                        'is_disposable'  => false,
                        'autocorrect'    => $autocorrect,
                        'quality_score'  => $qualityScore,
                        'message'        => 'This email was flagged as inactive, high risk, or suspicious. Please provide a reliable email address.',
                        'source'         => 'abstract_api'
                    ];
                    Cache::put($cacheKey, $result, 86400 * 14);
                    return $result;
                }

                // Deliverable email
                $result = [
                    'valid'          => true,
                    'email'          => $email,
                    'domain'         => $domain,
                    'deliverability' => $deliverability,
                    'is_disposable'  => false,
                    'autocorrect'    => $autocorrect,
                    'quality_score'  => $qualityScore,
                    'message'        => $isInstitutional ? "Official institutional email verified (@{$domain})." : "Email address is active and deliverable.",
                    'source'         => 'abstract_api'
                ];
                Cache::put($cacheKey, $result, 86400 * 14);
                return $result;
            }

            // If Abstract API returned 401, 429, or 500:
            $statusCode = $response->status();
            $errBody = $response->json();
            Log::warning("Abstract API email check non-200 status [{$statusCode}]: " . json_encode($errBody));

            if ($statusCode === 401) {
                Cache::put($circuitBreakerKey, 'unauthorized', 600); // 10 minutes circuit break
            } elseif ($statusCode === 429) {
                Cache::put($circuitBreakerKey, 'rate_limited', 3600); // 1 hour circuit break
            }

            // Graceful fallback to DNS MX records so reservations are not blocked by third-party errors
            return [
                'valid'          => true,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'DELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.85,
                'message'        => $isInstitutional ? "Official institutional email verified (@{$domain})." : "Email domain @{$domain} is active and deliverable.",
                'source'         => $isInstitutional ? 'institutional' : 'dns_fallback'
            ];
        } catch (\Throwable $e) {
            Log::warning("Abstract API email validation request exception: " . $e->getMessage());

            // Graceful fallback to DNS verification
            return [
                'valid'          => true,
                'email'          => $email,
                'domain'         => $domain,
                'deliverability' => 'DELIVERABLE',
                'is_disposable'  => false,
                'autocorrect'    => null,
                'quality_score'  => 0.85,
                'message'        => $isInstitutional ? "Official institutional email verified (@{$domain})." : "Email domain @{$domain} is active and deliverable.",
                'source'         => $isInstitutional ? 'institutional' : 'dns_fallback'
            ];
        }
    }

    /**
     * Detect keyboard-mash, randomized strings, or gibberish usernames (e.g. asdadadsa, asdfghjkl, etc.)
     */
    public static function isRandomOrGibberishUsername(string $user): bool
    {
        $user = strtolower(trim($user));

        // 1. Obvious fake usernames
        if (preg_match('/^(test|fake|dummy|sample|temp|random|nobody|void|anon|anonymous|asdf|qwerty|aasdw)[0-9_.-]*$/i', $user)) {
            return true;
        }

        // Strip numbers and common punctuation to analyze base alphabet pattern
        $clean = preg_replace('/[._\-0-9]/', '', $user);
        if (strlen($clean) < 4) {
            return false; // Short real names like 'dan', 'ana', 'ian' are allowed
        }

        $len = strlen($clean);

        // 2. QWERTY / Gaming keyboard mash sequences
        $keyboardSequences = [
            'asdf', 'fdsa', 'qwer', 'rewq', 'zxcv', 'vcxz', 'hjkl', 'lkjh',
            'uiop', 'poiu', 'yuiop', 'tyui', 'ghjk', 'bnm', 'mnb',
            'asdw', 'wasd', 'sdwa', 'dwas', 'aasdw', 'asda', 'dadad', 'adada',
            'sasa', 'dsad', 'sdas', 'dsa', 'asd', 'qwe', 'zxc', 'wsad'
        ];
        foreach ($keyboardSequences as $seq) {
            if (str_contains($clean, $seq) && $len <= 12) {
                if (in_array($clean, ['casdas', 'asdasd', 'asdadadsa', 'asdadsa', 'asdfghjkl', 'asdf', 'asdfgh', 'aasdw', 'asdw', 'wasd', 'wsad'])) {
                    return true;
                }
                if (strlen($seq) >= 4) {
                    return true;
                }
            }
        }

        // 3. Single-cluster keyboard mash patterns (e.g. aasdw, wasd, qwer, zxcv)
        if ($len >= 4) {
            if (preg_match('/^[asdw]+$/i', $clean)) return true;
            if (preg_match('/^[qwer]+$/i', $clean)) return true;
            if (preg_match('/^[zxcv]+$/i', $clean)) return true;
            if (preg_match('/^[hjkl]+$/i', $clean)) return true;
            if (preg_match('/^[uiop]+$/i', $clean)) return true;
        }

        // 4. Low distinct character ratio (e.g. 'asdadadsa': length 9, but only 3 unique characters)
        $uniqueCount = count(count_chars($clean, 1));
        if ($len >= 5 && ($uniqueCount / $len) <= 0.40) {
            return true;
        }

        // 5. Repeating character clusters (e.g. 'aaaa', 'zzzzz', '1111')
        if (preg_match('/(.)\1{3,}/', $user)) {
            return true;
        }

        // 6. Repeated 2 or 3-char syllable loops (e.g. 'asdasd', 'dadada', 'ababab', 'xyxyxy')
        if (preg_match('/^([a-z]{2,3})\1{2,}$/', $clean)) {
            return true;
        }

        // 7. Unpronounceable consonant clusters (>= 4 consecutive consonants)
        if (preg_match('/[bcdfghjklmnpqrstvwxz]{4,}/', $clean)) {
            return true;
        }

        // 8. Long string with no vowels (>= 4 characters without a, e, i, o, u, y)
        if ($len >= 4 && !preg_match('/[aeiouy]/', $clean)) {
            return true;
        }

        // 9. Alternating home-row / single row keyboard mash
        if ($len >= 5 && preg_match('/^[asd]+$/', $clean)) {
            return true;
        }
        if ($len >= 5 && preg_match('/^[qwer]+$/', $clean)) {
            return true;
        }
        if ($len >= 5 && preg_match('/^[zxcv]+$/', $clean)) {
            return true;
        }

        // 10. Non-natural ending consonant cluster (e.g. sdw, dfg, jkl)
        if ($len >= 4 && preg_match('/[bcdfghjklmnpqrstvwxz]{3,}$/i', $clean) && !preg_match('/(ck|ch|sh|th|ng|ll|ss|tt|nt|nd|rt|rd|st|ld|lt|mp|rk|nk|sk)$/i', $clean)) {
            return true;
        }

        return false;
    }

    /**
     * Direct test utility to probe Abstract API key connectivity and account health.
     */
    public static function testApiKey(?string $key = null): array
    {
        $apiKey = $key ?: config('services.abstract.email_validation_key') ?: env('ABSTRACT_EMAIL_API_KEY');
        if (empty($apiKey)) {
            return [
                'success' => false,
                'code'    => 'missing_key',
                'message' => 'No Abstract API key configured in .env (ABSTRACT_EMAIL_API_KEY).',
            ];
        }

        $apiUrl = config('services.abstract.api_url', 'https://emailvalidation.abstractapi.com/v1/');

        try {
            $start = microtime(true);
            $response = Http::timeout(5)
                ->withoutVerifying()
                ->get($apiUrl, [
                    'api_key' => $apiKey,
                    'email'   => 'support@urios.edu.ph',
                ]);
            $elapsedMs = round((microtime(true) - $start) * 1000);

            if ($response->successful()) {
                // Clear any circuit breaker
                Cache::forget('abstract_api_circuit_breaker_' . md5($apiKey));
                return [
                    'success'    => true,
                    'latency_ms' => $elapsedMs,
                    'data'       => $response->json(),
                    'message'    => "Abstract API connected successfully! Latency: {$elapsedMs}ms",
                ];
            }

            $status = $response->status();
            $body = $response->json();
            return [
                'success' => false,
                'status'  => $status,
                'data'    => $body,
                'message' => $body['error']['message'] ?? "Abstract API returned HTTP {$status}.",
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error'   => $e->getMessage(),
                'message' => 'Failed to reach Abstract API endpoint: ' . $e->getMessage(),
            ];
        }
    }
}
