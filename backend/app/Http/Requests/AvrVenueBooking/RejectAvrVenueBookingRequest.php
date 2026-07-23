<?php

namespace App\Http\Requests\AvrVenueBooking;

use Illuminate\Foundation\Http\FormRequest;

class RejectAvrVenueBookingRequest extends FormRequest
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