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

    public function prepareForValidation(): void
    {
        $this->merge([
            'reference_type' => $this->input('reference_type') ?? $this->input('inspectable_type') ?? 'avr_venue_booking',
            'reference_id'   => $this->input('reference_id') ?? $this->input('inspectable_id'),
            'inspection_type' => $this->input('inspection_type') ?? 'post_use',
            'has_damage'     => $this->has('has_damage') ? $this->boolean('has_damage') : ($this->input('condition') === 'damaged' || $this->input('inspection_status') === 'violation'),
            'condition_notes'=> $this->input('condition_notes') ?? $this->input('notes') ?? $this->input('remarks'),
        ]);
    }

    public function rules(): array
    {
        return [
            'reference_type'       => ['required', 'string'],
            'reference_id'         => ['required', 'integer'],
            'inspection_type'      => ['required', 'string'],
            'condition_notes'      => ['nullable', 'string', 'max:5000'],
            'has_damage'           => ['required', 'boolean'],
            'damage_charge_amount' => ['nullable', 'numeric', 'min:0'],
            'violation_type'       => ['nullable', 'string', 'max:255'],
            'evidence_photo'       => ['nullable', 'string'],
            'evidence_image'       => ['nullable', 'string'],
        ];
    }
}
