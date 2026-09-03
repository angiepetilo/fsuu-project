<?php

namespace App\Http\Requests\Public;

use App\Models\EmailVerification;
use App\Rules\ActiveDeliverableEmail;
use App\Rules\ValidPhilippineMobileNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'first_name' => ['nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'requestor_name' => ['required', 'string', 'max:255'],
            'requestor_email' => ['required', 'email', 'max:255', new ActiveDeliverableEmail],
            'requestor_contact_number' => ['required', 'string', new ValidPhilippineMobileNumber],
            'requestor_program_office' => ['nullable', 'string'],
            'requestor_identity_type' => ['nullable', 'string'],
            'booking_classification' => ['nullable', 'string'],
            'purpose' => ['required', 'string'],
            'number_of_persons' => ['nullable', 'integer'],
            'equipment_notes' => ['nullable', 'string'],
            'contact_preference' => ['nullable', 'string'],
            'date_of_usage' => ['required', 'string'],
            'reservation_end_date' => ['nullable', 'string'],
            'time_start' => ['required', 'string'],
            'time_end' => ['required', 'string'],
            'equipment_items' => ['nullable'],
            'endorsement_file' => ['nullable'],
            'is_pin_verified' => ['nullable'],
            'pin_code' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $email = $this->input('requestor_email');
            if ($email && !EmailVerification::isEmailVerified($email)) {
                $validator->errors()->add(
                    'requestor_email',
                    'The email address provided has not been verified via OTP. Please complete email verification before submitting.'
                );
            }
        });
    }
}
