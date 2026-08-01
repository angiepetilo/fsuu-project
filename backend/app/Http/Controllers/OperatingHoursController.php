<?php

namespace App\Http\Controllers;

use App\Models\OperatingHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperatingHoursController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $hours = OperatingHour::where('office_id', $user->office_id)->first();

        if (!$hours) {
            // Return sensible defaults if not configured yet
            return response()->json([
                'office_id'           => $user->office_id,
                'venue_open'          => '07:00',
                'venue_close'         => '17:00',
                'equipment_open'      => '07:00',
                'equipment_close'     => '17:00',
                'arrival_grace_mins'  => 15,
                'return_grace_mins'   => 30,
                'auto_cancel_mins'    => 30,
            ]);
        }

        return response()->json($hours);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'venue_open'          => 'required|date_format:H:i',
            'venue_close'         => 'required|date_format:H:i|after:venue_open',
            'equipment_open'      => 'required|date_format:H:i',
            'equipment_close'     => 'required|date_format:H:i|after:equipment_open',
            'arrival_grace_mins'  => 'required|integer|min:0|max:120',
            'return_grace_mins'   => 'required|integer|min:0|max:120',
            'auto_cancel_mins'    => 'required|integer|min:0|max:120',
        ]);

        $data['office_id'] = $user->office_id;

        $hours = OperatingHour::updateOrCreate(
            ['office_id' => $user->office_id],
            $data
        );

        return response()->json($hours);
    }
}
