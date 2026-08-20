<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

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
            'requestor_name' => ['required', 'string'],
            'requestor_email' => ['required', 'email'],
            'requestor_contact_number' => ['required', 'string'],
            'requestor_program_office' => ['required', 'string'],
            'requestor_identity_type' => ['required', 'string'],
            'purpose' => ['required', 'string'],
            'place_of_use' => ['required', 'string'],
            'used_inside_campus' => ['nullable'],
            'contact_preference' => ['nullable', 'string'],
            'start_datetime' => ['required'],
            'end_datetime' => ['required'],
            'expected_return_datetime' => ['nullable'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.equipment_type_id' => ['required'],
            'items.*.quantity_requested' => ['nullable', 'integer', 'min:1'],
            'equipment_items' => ['nullable'],
            'endorsement_file' => ['nullable', 'file', 'max:10240'],
        ];
    }
}
