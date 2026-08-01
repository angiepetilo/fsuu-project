<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicAvrVenueBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint
    }

    public function rules(): array
    {
        return [
            'venue_id' => ['required', 'exists:venues,id'],
            'requestor_name' => ['required', 'string', 'max:255'],
            'requestor_email' => ['required', 'email', 'max:255'],
            'requestor_contact_number' => ['required', 'string', 'max:20'],
            'requestor_program_office' => ['required', 'string', 'max:255'],
            'requestor_identity_type' => ['required', 'in:student,faculty,staff,external'],
            'booking_classification' => ['required', 'in:organization,academic'],
            'purpose' => ['required', 'string'],
            'number_of_persons' => ['required', 'integer', 'min:1'],
            'title_of_reservation' => ['required', 'string', 'max:255'],
            'event_type' => ['required', 'string', 'max:255'],
            'equipment_notes' => ['nullable', 'string'],
            'contact_preference' => ['required', 'in:sms,email'],
            'start_datetime' => ['required', 'date'],
            'end_datetime' => ['required', 'date'],
            'endorsement_file' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:10240'],
        ];
    }
}
