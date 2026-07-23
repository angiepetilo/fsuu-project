<?php

namespace App\Http\Requests\AvrEquipmentBorrowing;

use Illuminate\Foundation\Http\FormRequest;

class RejectAvrEquipmentBorrowingRequest extends FormRequest
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
