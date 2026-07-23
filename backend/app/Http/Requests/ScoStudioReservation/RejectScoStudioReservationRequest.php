<?php

namespace App\Http\Requests\ScoStudioReservation;

use Illuminate\Foundation\Http\FormRequest;

class RejectScoStudioReservationRequest extends FormRequest
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
