<?php

namespace App\Rules;

use App\Services\AbstractEmailValidationService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ActiveDeliverableEmail implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $email = trim((string) $value);

        $service = app(AbstractEmailValidationService::class);
        $result = $service->validate($email);

        if (!$result['valid']) {
            $fail($result['message'] ?: "The :attribute must be an active, deliverable, non-disposable email address.");
        }
    }
}
