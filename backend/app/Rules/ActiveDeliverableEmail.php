<?php

namespace App\Rules;

use App\Services\AbstractEmailValidationService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ActiveDeliverableEmail implements ValidationRule
{
    protected ?bool $isPortal = null;

    public function __construct(?bool $isPortal = null)
    {
        $this->isPortal = $isPortal;
    }

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $email = trim((string) $value);

        $service = app(AbstractEmailValidationService::class);
        $isPortal = $this->isPortal ?? (
            request()->boolean('is_portal') ||
            request()->input('context') === 'portal' ||
            auth('sanctum')->check()
        );

        $result = $service->validate($email, $isPortal);

        if (!$result['valid']) {
            $fail($result['message'] ?: "The :attribute must be an active, deliverable, non-disposable email address.");
        }
    }
}
