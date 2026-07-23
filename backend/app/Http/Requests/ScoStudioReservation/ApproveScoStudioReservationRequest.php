<?php

namespace App\Http\Requests\ScoStudioReservation;

use Illuminate\Foundation\Http\FormRequest;

class ApproveScoStudioReservationRequest extends FormRequest
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
