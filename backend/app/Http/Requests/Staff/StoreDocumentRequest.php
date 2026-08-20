<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // 5MB max
            'reference_type' => ['required', 'string', Rule::in(['avr_venue_booking', 'equipment_borrowing'])],
            'reference_id' => ['required', 'integer'],
            'document_type' => ['required', 'string', Rule::in(['excuse_letter', 'payment_receipt', 'other'])],
        ];
    }
}
