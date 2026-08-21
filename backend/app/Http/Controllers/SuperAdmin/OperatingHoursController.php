<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\OperatingHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperatingHoursController extends Controller
{
    public function publicShow(Request $request): JsonResponse
    {
        $hours = OperatingHour::first();

        if (!$hours) {
            return response()->json([
                'venue_open'          => '07:30',
                'venue_close'         => '17:00',
                'equipment_open'      => '08:00',
                'equipment_close'     => '16:30',
                'arrival_grace_mins'  => 15,
                'return_grace_mins'   => 30,
                'auto_cancel_mins'    => 30,
            ]);
        }

        return response()->json($hours);
    }

    public function show(Request $request): JsonResponse
    {
        $hours = OperatingHour::first();

        if (!$hours) {
            return response()->json([
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
        $data = $request->validate([
            'venue_open'          => 'required',
            'venue_close'         => 'required',
            'equipment_open'      => 'required',
            'equipment_close'     => 'required',
            'arrival_grace_mins'  => 'required|integer|min:0|max:120',
            'return_grace_mins'   => 'required|integer|min:0|max:120',
            'auto_cancel_mins'    => 'required|integer|min:0|max:120',
        ]);

        $formatTime = function ($t) {
            if (!$t) return '07:00:00';
            $parts = explode(':', $t);
            $h = str_pad($parts[0] ?? '07', 2, '0', STR_PAD_LEFT);
            $m = str_pad($parts[1] ?? '00', 2, '0', STR_PAD_LEFT);
            return "{$h}:{$m}:00";
        };

        $data['venue_open'] = $formatTime($data['venue_open']);
        $data['venue_close'] = $formatTime($data['venue_close']);
        $data['equipment_open'] = $formatTime($data['equipment_open']);
        $data['equipment_close'] = $formatTime($data['equipment_close']);

        $hours = OperatingHour::first();
        if ($hours) {
            $hours->update($data);
        } else {
            $hours = OperatingHour::create($data);
        }

        return response()->json($hours);
    }
}
