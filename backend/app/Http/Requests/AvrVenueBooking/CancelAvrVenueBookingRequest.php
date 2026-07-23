<?php

namespace App\Http\Requests\AvrVenueBooking;

use Illuminate\Foundation\Http\FormRequest;

class CancelAvrVenueBookingRequest extends FormRequest
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