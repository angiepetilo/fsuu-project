<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ActiveDeliverableEmail implements ValidationRule
{
    /**
     * Common disposable / throwaway email domains to reject.
     */
    protected static array $disposableDomains = [
        'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
        'trashmail.com', 'yopmail.com', 'sharklasers.com', 'dispostable.com',
        'getairmail.com', 'fakemailgenerator.com', 'throwawaymail.com', 'generator.email',
        'temp-mail.org', 'tempmailo.com', 'burnermail.io', 'nada.ltd', 'mohmal.com'
    ];

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $email = trim((string) $value);

        // 1. Basic format & length check
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $fail("The :attribute must be a valid email address.");
            return;
        }

        // 2. Extract domain
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            $fail("The :attribute has an invalid format.");
            return;
        }

        $domain = strtolower(trim($parts[1]));

        // 3. Reject disposable domains
        if (in_array($domain, self::$disposableDomains, true)) {
            $fail("The email domain could not be verified. Disposable or temporary email addresses are not accepted.");
            return;
        }

        // 4. In testing environment or localhost, skip live DNS lookup
        if (app()->environment('testing') || $domain === 'localhost' || str_ends_with($domain, '.test') || str_ends_with($domain, '.local')) {
            return;
        }

        // Institutional domains always pass
        if (in_array($domain, ['urios.edu.ph', 'fsuu.edu.ph'], true)) {
            return;
        }

        // 5. Check DNS MX (Mail Exchange) or A / AAAA records
        $hasMx = false;
        try {
            if (function_exists('checkdnsrr')) {
                $hasMx = checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A') || checkdnsrr($domain, 'AAAA');
            } else {
                $records = @dns_get_record($domain, DNS_MX | DNS_A | DNS_AAAA);
                $hasMx = !empty($records);
            }
        } catch (\Throwable $e) {
            // If DNS lookup fails due to system network restrictions, fallback safely
            $hasMx = true;
        }

        if (!$hasMx) {
            $fail("The email domain could not be verified. Please provide a real email address.");
        }
    }
}
