<?php

namespace App\Http\Requests\EquipmentBorrowing;

use Illuminate\Foundation\Http\FormRequest;

class RejectEquipmentBorrowingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'remarks' => ['required', 'string', 'max:1000'],
        ];
    }
}
