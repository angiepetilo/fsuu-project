<?php

namespace App\Http\Requests\ScoStudioReservation;

use Illuminate\Foundation\Http\FormRequest;

class StoreScoStudioReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
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
            'contact_preference' => ['required', 'in:sms,email'],
            'start_datetime' => ['required', 'date', 'after:now'],
            'end_datetime' => ['required', 'date', 'after:start_datetime'],
        ];
    }
}
