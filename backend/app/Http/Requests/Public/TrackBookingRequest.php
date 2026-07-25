<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class TrackBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reference_code' => ['required', 'string', 'max:50'],
            'requestor_email' => ['nullable', 'email', 'max:255'],
        ];
    }
}
