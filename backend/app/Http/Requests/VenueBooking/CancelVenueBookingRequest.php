<?php

namespace App\Http\Requests\VenueBooking;

use Illuminate\Foundation\Http\FormRequest;

class CancelVenueBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
