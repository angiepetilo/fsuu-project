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
            'requestor_email' => [
                'required',
                'email',
                'max:255',
                function ($attribute, $value, $fail) {
                    $clean = strtolower(trim((string)$value));
                    if (!str_ends_with($clean, '@urios.edu.ph')) {
                        $fail('The requestor email must be an official university email ending with @urios.edu.ph.');
                    }
                    $username = explode('@', $clean)[0] ?? '';
                    if (preg_match('/[0-9]/', $username)) {
                        $fail('Official institutional emails (@urios.edu.ph) contain no numbers (e.g. student ID numbers like 202100452@urios.edu.ph are not valid). Please use your official name-based email.');
                    }
                },
                new ActiveDeliverableEmail,
            ],
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
            $settings = \App\Models\VerificationPinSetting::first();
            $isSystemEnabled = $settings ? (bool)$settings->is_enabled : true;
            $requirePhone = ($settings && $isSystemEnabled) ? (bool)$settings->venue_verify_phone : false;
            $requireEmail = ($settings && $isSystemEnabled) ? (bool)$settings->venue_verify_email : false;

            $phone = $this->input('requestor_contact_number');
            if ($requirePhone && $phone && !\App\Models\PhoneVerification::isPhoneVerified($phone)) {
                $validator->errors()->add(
                    'requestor_contact_number',
                    'The contact phone number provided has not been verified via SMS OTP. Please complete mobile verification before submitting.'
                );
            }

            $email = $this->input('requestor_email');
            if ($requireEmail && $email && !\App\Models\EmailVerification::isEmailVerified($email)) {
                $validator->errors()->add(
                    'requestor_email',
                    'The email address provided has not been verified via OTP. Please complete email verification before submitting.'
                );
            }
        });
    }
}
