<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicVenueBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint
    }

    public function rules(): array
    {
        return [
            'venue_id' => ['required'],
            'requestor_name' => ['required', 'string', 'max:255'],
            'requestor_email' => ['required', 'email', 'max:255'],
            'requestor_contact_number' => ['required', 'string'],
            'requestor_program_office' => ['nullable', 'string'],
            'requestor_identity_type' => ['nullable', 'string'],
            'booking_classification' => ['nullable', 'string'],
            'purpose' => ['required', 'string'],
            'number_of_persons' => ['nullable', 'integer'],
            'title_of_reservation' => ['nullable', 'string'],
            'event_type' => ['nullable', 'string'],
            'equipment_notes' => ['nullable', 'string'],
            'contact_preference' => ['nullable', 'string'],
            'start_datetime' => ['nullable', 'string'],
            'end_datetime' => ['nullable', 'string'],
            'date_of_usage' => ['nullable', 'string'],
            'reservation_end_date' => ['nullable', 'string'],
            'time_start' => ['nullable', 'string'],
            'time_end' => ['nullable', 'string'],
            'equipment_items' => ['nullable'],
            'endorsement_file' => ['nullable'],
            'is_pin_verified' => ['nullable'],
            'pin_override' => ['nullable'],
            'pin_code' => ['nullable', 'string'],
        ];
    }
}
