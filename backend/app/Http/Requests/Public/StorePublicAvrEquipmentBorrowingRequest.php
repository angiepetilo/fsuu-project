<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicAvrEquipmentBorrowingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'avr_venue_booking_id' => ['nullable', 'exists:avr_venue_bookings,id'],
            'requestor_name' => ['required', 'string'],
            'requestor_email' => ['required', 'email'],
            'requestor_contact_number' => ['required', 'string'],
            'requestor_program_office' => ['required', 'string'],
            'requestor_identity_type' => ['required', 'in:student,faculty,staff,external'],
            'purpose' => ['required', 'string'],
            'place_of_use' => ['required', 'string'],
            'used_inside_campus' => ['required', 'boolean'],
            'contact_preference' => ['required', 'in:sms,email'],
            'start_datetime' => ['required', 'date', 'after:now'],
            'end_datetime' => ['required', 'date', 'after:start_datetime'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.equipment_type_id' => ['required', 'exists:equipment_types,id'],
            'items.*.quantity_requested' => ['required', 'integer', 'min:1'],
        ];
    }
}
