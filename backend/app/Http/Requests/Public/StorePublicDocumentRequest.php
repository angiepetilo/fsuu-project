<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // Max 5MB
            'reference_type' => ['required', 'string', 'in:avr_venue_booking,sco_studio_reservation,equipment_borrowing'],
            'reference_code' => ['required', 'string'],
            'requestor_email' => ['required', 'email'],
        ];
    }
}
