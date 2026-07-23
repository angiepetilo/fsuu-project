<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reference_type' => ['required', 'string', Rule::in(['avr_venue_booking', 'equipment_borrowing', 'sco_studio_reservation'])],
            'reference_id' => ['required', 'integer'],
            'inspection_type' => ['required', 'string', Rule::in(['pre_use', 'post_use'])],
            'condition_notes' => ['nullable', 'string', 'max:500'],
            'has_damage' => ['required', 'boolean'],
            'damage_charge_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
