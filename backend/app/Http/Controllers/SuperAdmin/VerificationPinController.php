<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\VerificationPinSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerificationPinController extends Controller
{
    /**
     * Authenticated endpoint for SuperAdmin / Admin to fetch PIN settings
     */
    public function show(Request $request): JsonResponse
    {
        $setting = VerificationPinSetting::first();

        if (!$setting) {
            $setting = VerificationPinSetting::create([
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

        $setting = VerificationPinSetting::first();

        if (!$setting) {
            $setting = new VerificationPinSetting();
        }

        if (isset($validated['masterPin']) && !empty($validated['masterPin'])) {
            $setting->master_pin = $validated['masterPin'];
            // Always keep the hashed copy in sync
            $setting->hashed_master_pin = \Illuminate\Support\Facades\Hash::make($validated['masterPin']);
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
     * Public endpoint to securely verify a submitted PIN.
     * Uses bcrypt Hash::check() against hashed_master_pin column.
     * Falls back to plain-text equality for rows not yet migrated.
     */
    public function verifyPin(Request $request): JsonResponse
    {
        $request->validate([
            'pin' => 'required|string',
        ]);

        $submittedPin = trim($request->input('pin'));
        $setting = VerificationPinSetting::first();

        if (!$setting) {
            // No setting row exists yet — compare against the default PIN
            $valid = $submittedPin === '123456';
        } elseif (!empty($setting->hashed_master_pin)) {
            // Preferred: constant-time hash comparison
            $valid = \Illuminate\Support\Facades\Hash::check($submittedPin, $setting->hashed_master_pin);
        } else {
            // Fallback: plain-text comparison for un-migrated rows
            $valid = $submittedPin === trim((string) $setting->master_pin);
        }

        if ($valid) {
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
