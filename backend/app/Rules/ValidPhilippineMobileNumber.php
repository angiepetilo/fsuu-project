<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidPhilippineMobileNumber implements ValidationRule
{
    /**
     * Known repetitive and sequential dummy test patterns to reject.
     */
    protected static array $dummyPatterns = [
        '09123456789', '09876543210', '09000000000', '09111111111', '09222222222',
        '09333333333', '09444444444', '09555555555', '09666666666', '09777777777',
        '09888888888', '09999999999', '09012345678', '09987654321', '09121212121',
        '09090909090',
    ];

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $raw = trim((string) $value);

        // Strip all non-digits except a leading plus
        $clean = preg_replace('/[^0-9]/', '', $raw);

        // Normalize to standard 09XXXXXXXXX format
        if (str_starts_with($clean, '63')) {
            $clean = '0' . substr($clean, 2);
        } elseif (strlen($clean) === 10 && (str_starts_with($clean, '9') || str_starts_with($clean, '8'))) {
            $clean = '0' . $clean;
        }

        // 1. Length check (must be exactly 11 digits)
        if (strlen($clean) !== 11) {
            $fail("The :attribute must be an 11-digit Philippine mobile number (e.g., 09171234567).");
            return;
        }

        // 2. Format check (must start with 09 or 08)
        if (!str_starts_with($clean, '09') && !str_starts_with($clean, '08')) {
            $fail("The :attribute must start with a valid Philippine mobile prefix (09XX or 08XX).");
            return;
        }

        // 3. Reject dummy / repeated patterns
        if (in_array($clean, self::$dummyPatterns, true)) {
            $fail("The provided mobile number appears to be a placeholder or dummy number. Please provide an active contact number.");
            return;
        }

        // Also check for 7 or more repeated single digits (e.g. 09170000000)
        if (preg_match('/(\d)\1{6,}/', substr($clean, 4))) {
            $fail("The provided mobile number contains an invalid sequence of repeated digits.");
            return;
        }
    }
}
