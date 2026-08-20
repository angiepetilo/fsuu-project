<?php

namespace App\Http\Requests\EquipmentBorrowing;

use Illuminate\Foundation\Http\FormRequest;

class ApproveEquipmentBorrowingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
