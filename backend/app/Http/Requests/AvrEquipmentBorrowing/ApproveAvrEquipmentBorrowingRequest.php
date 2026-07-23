<?php

namespace App\Http\Requests\AvrEquipmentBorrowing;

use Illuminate\Foundation\Http\FormRequest;

class ApproveAvrEquipmentBorrowingRequest extends FormRequest
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
