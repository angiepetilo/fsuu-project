<?php

namespace App\Http\Requests\Public;

use App\Models\PhoneVerification;
use App\Rules\ActiveDeliverableEmail;
use App\Rules\ValidPhilippineMobileNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePublicEquipmentBorrowingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $mergeData = [];

        // Parse equipment_items if sent as JSON string
        if ($this->has('equipment_items') && is_string($this->input('equipment_items'))) {
            $decoded = json_decode($this->input('equipment_items'), true);
            if (is_array($decoded)) {
                $mergeData['items'] = $decoded;
            }
        }

        // Map expected_return_datetime to end_datetime if end_datetime is missing
        if (!$this->filled('end_datetime') && $this->filled('expected_return_datetime')) {
            $mergeData['end_datetime'] = $this->input('expected_return_datetime');
        }

        // Default used_inside_campus to true if not provided
        if (!$this->has('used_inside_campus')) {
            $mergeData['used_inside_campus'] = true;
        }

        // Default contact_preference to email if not provided
        if (!$this->has('contact_preference')) {
            $mergeData['contact_preference'] = 'email';
        }

        if (!empty($mergeData)) {
            $this->merge($mergeData);
        }
    }

    public function rules(): array
    {
        return [
            'avr_venue_booking_id' => ['nullable'],
            'office_id' => ['nullable', 'integer'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'requestor_name' => ['required', 'string'],
            'requestor_email' => ['required', 'email', new ActiveDeliverableEmail],
            'requestor_contact_number' => ['required', 'string', new ValidPhilippineMobileNumber],
            'requestor_program_office' => ['required', 'string'],
            'requestor_identity_type' => ['required', 'string'],
            'purpose' => ['required', 'string'],
            'place_of_use' => ['required', 'string'],
            'handler_name' => ['nullable', 'string'],
            'used_inside_campus' => ['nullable'],
            'contact_preference' => ['nullable', 'string'],
            'start_datetime' => ['required'],
            'end_datetime' => ['required'],
            'is_pin_verified' => ['nullable'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.equipment_type_id' => ['required'],
            'items.*.quantity_requested' => ['nullable', 'integer', 'min:1'],
            'equipment_items' => ['nullable'],
            'endorsement_file' => ['nullable', 'file', 'max:10240'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $phone = $this->input('requestor_contact_number');
            if ($phone && !PhoneVerification::isPhoneVerified($phone)) {
                $validator->errors()->add(
                    'requestor_contact_number',
                    'The contact phone number provided has not been verified via SMS OTP. Please complete mobile verification before submitting.'
                );
            }

            // Public policy: Users cannot borrow equipment for tomorrow unless today's operating hours have ended
            $startDt = $this->input('start_datetime');
            if ($startDt) {
                try {
                    $startCarbon = \Carbon\Carbon::parse($startDt);
                    $tomorrow = \Carbon\Carbon::tomorrow();

                    if ($startCarbon->greaterThanOrEqualTo($tomorrow)) {
                        $opHours = \App\Models\OperatingHour::first();
                        $closeTimeStr = $opHours && $opHours->equipment_close ? substr($opHours->equipment_close, 0, 5) : '17:00';
                        $openTimeStr  = $opHours && $opHours->equipment_open ? substr($opHours->equipment_open, 0, 5) : '08:00';

                        $nowTime = \Carbon\Carbon::now()->format('H:i');
                        $isWithinOperatingHours = ($nowTime >= $openTimeStr && $nowTime < $closeTimeStr);

                        if ($isWithinOperatingHours && !$this->input('is_pin_verified')) {
                            $validator->errors()->add(
                                'start_datetime',
                                "In public view, equipment cannot be borrowed for tomorrow until today's operating hours have ended ({$closeTimeStr})."
                            );
                        }
                    }
                } catch (\Throwable $e) {}
            }
        });
    }
}
