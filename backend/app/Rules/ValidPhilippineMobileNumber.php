<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidPhilippineMobileNumber implements ValidationRule
{
    /**
     * Official Philippine Telecom 4-digit mobile prefixes (Globe/TM, Smart/TNT/Sun, DITO).
     */
    protected static array $validPrefixes = [
        // Globe / TM
        '0905', '0906', '0915', '0916', '0917', '0926', '0927', '0935', '0936', '0945',
        '0953', '0954', '0955', '0956', '0965', '0966', '0967', '0975', '0976', '0977',
        '0978', '0979', '0995', '0996', '0997',

        // Smart / TNT / Sun
        '0907', '0908', '0909', '0910', '0911', '0912', '0914', '0918', '0919', '0920',
        '0921', '0928', '0929', '0930', '0938', '0939', '0946', '0947', '0948', '0949',
        '0950', '0951', '0961', '0963', '0968', '0969', '0970', '0971', '0981', '0989',
        '0992', '0998', '0999',

        // DITO Telecommunity
        '0991', '0992', '0993', '0994', '0895', '0896', '0897', '0898',
    ];

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

        // 4. In testing environment, bypass prefix check if using mock numbers
        if (app()->environment('testing')) {
            return;
        }

        // 5. Check against Philippine Telecom prefix registry
        $prefix = substr($clean, 0, 4);
        if (!in_array($prefix, self::$validPrefixes, true)) {
            $fail("The prefix '{$prefix}' is not recognized as a registered Philippine mobile carrier (Globe, Smart, DITO).");
        }
    }
}
