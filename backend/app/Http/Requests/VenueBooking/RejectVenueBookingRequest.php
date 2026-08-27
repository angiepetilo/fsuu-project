<?php

namespace App\Http\Requests\VenueBooking;

use Illuminate\Foundation\Http\FormRequest;

class RejectVenueBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    protected function prepareForValidation(): void
    {
        $comment = $this->input('remarks') ?? $this->input('rejection_reason') ?? $this->input('reason') ?? 'Venue booking rejected by administrator';
        $this->merge([
            'remarks' => trim((string)$comment),
        ]);
    }

    public function rules(): array
    {
        return [
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
