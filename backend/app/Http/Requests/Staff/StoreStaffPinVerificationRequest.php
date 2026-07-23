<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;

class StoreStaffPinVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'raw_pin' => ['required', 'string'],
            'contact_method_verified' => ['required', 'string', 'in:email,sms,in_person,id_card'],
        ];
    }
}
