<?php

namespace App\Http\Requests\VenueBooking;

use Illuminate\Foundation\Http\FormRequest;

class RejectVenueBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'remarks' => ['required', 'string', 'max:1000'],
        ];
    }
}
