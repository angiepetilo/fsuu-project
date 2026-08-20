<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\VerificationPinSetting;
use App\Models\Office;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerificationPinController extends Controller
{
    /**
     * Authenticated endpoint for SuperAdmin / Admin to fetch PIN settings
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $officeId = $user ? ($user->office_id ?: 1) : 1;

        $setting = VerificationPinSetting::where('office_id', $officeId)
            ->orWhereNull('office_id')
            ->first();

        if (!$setting) {
            $setting = VerificationPinSetting::create([
                'office_id'                  => $officeId,
                'master_pin'                 => '123456',
                'is_enabled'                 => true,
                'require_outside_hours'      => true,
                'require_multi_day_venue'    => true,
                'require_multi_day_equipment'=> true,
                'require_external'           => true,
                'pin_mode'                   => 'optional',
            ]);
        }

        return response()->json([
            'id'                          => $setting->id,
            'office_id'                   => $setting->office_id,
            'masterPin'                   => $setting->master_pin,
            'isEnabled'                   => (bool) $setting->is_enabled,
            'requirePinOutsideHours'      => (bool) $setting->require_outside_hours,
            'requirePinMultiDayVenue'     => (bool) $setting->require_multi_day_venue,
            'requirePinMultiDayEquipment' => (bool) $setting->require_multi_day_equipment,
            'enableExternalVenue'         => (bool) $setting->require_external,
            'enableExternalEquipment'     => (bool) $setting->require_external,
            'requirePinForStudent'        => $setting->pin_mode === 'required',
            'pinMode'                     => $setting->pin_mode,
        ]);
    }

    /**
     * Authenticated endpoint to update PIN and toggle trigger rules
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $officeId = $user ? ($user->office_id ?: 1) : 1;

        $validated = $request->validate([
            'masterPin'                   => 'nullable|string|min:4|max:10',
            'isEnabled'                   => 'nullable|boolean',
            'requirePinOutsideHours'      => 'nullable|boolean',
            'requirePinMultiDayVenue'     => 'nullable|boolean',
            'requirePinMultiDayEquipment' => 'nullable|boolean',
            'enableExternalVenue'         => 'nullable|boolean',
            'enableExternalEquipment'     => 'nullable|boolean',
            'requirePinForStudent'        => 'nullable|boolean',
            'pinMode'                     => 'nullable|string',
        ]);

        $setting = VerificationPinSetting::where('office_id', $officeId)
            ->orWhereNull('office_id')
            ->first();

        if (!$setting) {
            $setting = new VerificationPinSetting(['office_id' => $officeId]);
        }

        if (isset($validated['masterPin']) && !empty($validated['masterPin'])) {
            $setting->master_pin = $validated['masterPin'];
        }

        if (isset($validated['isEnabled'])) {
            $setting->is_enabled = (bool) $validated['isEnabled'];
        }

        if (isset($validated['requirePinOutsideHours'])) {
            $setting->require_outside_hours = (bool) $validated['requirePinOutsideHours'];
        }

        if (isset($validated['requirePinMultiDayVenue'])) {
            $setting->require_multi_day_venue = (bool) $validated['requirePinMultiDayVenue'];
        }

        if (isset($validated['requirePinMultiDayEquipment'])) {
            $setting->require_multi_day_equipment = (bool) $validated['requirePinMultiDayEquipment'];
        }

        if (isset($validated['enableExternalVenue']) || isset($validated['enableExternalEquipment'])) {
            $setting->require_external = (bool) ($validated['enableExternalVenue'] ?? $validated['enableExternalEquipment'] ?? true);
        }

        if (isset($validated['requirePinForStudent'])) {
            $setting->pin_mode = $validated['requirePinForStudent'] ? 'required' : 'optional';
        } elseif (isset($validated['pinMode'])) {
            $setting->pin_mode = $validated['pinMode'];
        }

        $setting->save();

        return response()->json([
            'message'                     => 'Verification PIN & trigger rules saved successfully.',
            'id'                          => $setting->id,
            'office_id'                   => $setting->office_id,
            'masterPin'                   => $setting->master_pin,
            'isEnabled'                   => (bool) $setting->is_enabled,
            'requirePinOutsideHours'      => (bool) $setting->require_outside_hours,
            'requirePinMultiDayVenue'     => (bool) $setting->require_multi_day_venue,
            'requirePinMultiDayEquipment' => (bool) $setting->require_multi_day_equipment,
            'enableExternalVenue'         => (bool) $setting->require_external,
            'enableExternalEquipment'     => (bool) $setting->require_external,
            'requirePinForStudent'        => $setting->pin_mode === 'required',
            'pinMode'                     => $setting->pin_mode,
        ]);
    }

    /**
     * Public endpoint to fetch active trigger rules (without exposing the master PIN)
     */
    public function publicSettings(Request $request): JsonResponse
    {
        $setting = VerificationPinSetting::first();

        if (!$setting) {
            return response()->json([
                'isEnabled'                   => true,
                'requirePinOutsideHours'      => true,
                'requirePinMultiDayVenue'     => true,
                'requirePinMultiDayEquipment' => true,
                'enableExternalVenue'         => true,
                'enableExternalEquipment'     => true,
                'requirePinForStudent'        => false,
                'pinMode'                     => 'optional',
            ]);
        }

        return response()->json([
            'isEnabled'                   => (bool) $setting->is_enabled,
            'requirePinOutsideHours'      => (bool) $setting->require_outside_hours,
            'requirePinMultiDayVenue'     => (bool) $setting->require_multi_day_venue,
            'requirePinMultiDayEquipment' => (bool) $setting->require_multi_day_equipment,
            'enableExternalVenue'         => (bool) $setting->require_external,
            'enableExternalEquipment'     => (bool) $setting->require_external,
            'requirePinForStudent'        => $setting->pin_mode === 'required',
            'pinMode'                     => $setting->pin_mode,
        ]);
    }

    /**
     * Public endpoint to securely verify a submitted PIN
     */
    public function verifyPin(Request $request): JsonResponse
    {
        $request->validate([
            'pin' => 'required|string',
        ]);

        $submittedPin = trim($request->input('pin'));
        $setting = VerificationPinSetting::first();
        $targetPin = $setting ? trim($setting->master_pin) : '123456';

        if ($submittedPin === $targetPin) {
            return response()->json([
                'valid'   => true,
                'message' => 'PIN verified successfully.',
            ]);
        }

        return response()->json([
            'valid'   => false,
            'message' => 'Invalid PIN Code. Please check the PIN issued by the AVR Head / Administrator.',
        ], 422);
    }
}
