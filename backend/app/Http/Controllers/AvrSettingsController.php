<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AvrSettingsController extends Controller
{
    private const CACHE_KEY = 'avr_operation_settings';

    public function index(): JsonResponse
    {
        $settings = Cache::get(self::CACHE_KEY, [
            'open_time'           => '08:00',
            'close_time'          => '17:00',
            'grace_period_hours'  => 1,
            'auto_cancel_enabled' => true,
        ]);

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'open_time'           => 'nullable|string',
            'close_time'          => 'nullable|string',
            'grace_period_hours'  => 'nullable|integer|min:0|max:72',
            'auto_cancel_enabled' => 'nullable|boolean',
        ]);

        $current  = Cache::get(self::CACHE_KEY, []);
        $updated  = array_merge($current, $data);
        Cache::put(self::CACHE_KEY, $updated, now()->addYears(10));

        return response()->json(['message' => 'Settings saved.', 'settings' => $updated]);
    }
}
