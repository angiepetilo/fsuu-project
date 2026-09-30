<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\OperatingHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperatingHoursController extends Controller
{
    private function formatTo12Hour(?string $timeStr): string
    {
        if (!$timeStr) return '';
        return date('h:i A', strtotime($timeStr));
    }

    public function publicShow(Request $request): JsonResponse
    {
        $hours = OperatingHour::first();

        if (!$hours) {
            return response()->json([
                'venue_open'          => '07:30:00',
                'venue_close'         => '17:00:00',
                'equipment_open'      => '07:30:00',
                'equipment_close'     => '17:00:00',
                'venue_open_12'       => '07:30 AM',
                'venue_close_12'      => '05:00 PM',
                'equipment_open_12'   => '07:30 AM',
                'equipment_close_12'  => '05:00 PM',
                'arrival_grace_mins'  => 15,
                'auto_cancel_mins'    => 30,
            ]);
        }

        $res = $hours->toArray();
        $res['venue_open_12']      = $this->formatTo12Hour($hours->venue_open);
        $res['venue_close_12']     = $this->formatTo12Hour($hours->venue_close);
        $res['equipment_open_12']  = $this->formatTo12Hour($hours->equipment_open);
        $res['equipment_close_12'] = $this->formatTo12Hour($hours->equipment_close);

        return response()->json($res);
    }

    public function show(Request $request): JsonResponse
    {
        $hours = OperatingHour::first();

        if (!$hours) {
            return response()->json([
                'venue_open'              => '07:30:00',
                'venue_close'             => '17:00:00',
                'equipment_open'          => '07:30:00',
                'equipment_close'         => '17:00:00',
                'venue_open_12'           => '07:30 AM',
                'venue_close_12'          => '05:00 PM',
                'equipment_open_12'       => '07:30 AM',
                'equipment_close_12'      => '05:00 PM',
                'arrival_grace_mins'      => 15,
                'auto_cancel_mins'        => 30,
                'requirement_grace_hours' => 24,
            ]);
        }

        $res = $hours->toArray();
        $res['venue_open_12']      = $this->formatTo12Hour($hours->venue_open);
        $res['venue_close_12']     = $this->formatTo12Hour($hours->venue_close);
        $res['equipment_open_12']  = $this->formatTo12Hour($hours->equipment_open);
        $res['equipment_close_12'] = $this->formatTo12Hour($hours->equipment_close);

        return response()->json($res);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'venue_open'              => 'required',
            'venue_close'             => 'required',
            'equipment_open'          => 'required',
            'equipment_close'         => 'required',
            'arrival_grace_mins'      => 'required|integer|min:0|max:120',
            'auto_cancel_mins'        => 'required|integer|min:0|max:120',
            'requirement_grace_hours' => 'nullable|integer|in:24,48',
        ]);
        $data['requirement_grace_hours'] = (int) ($data['requirement_grace_hours'] ?? 24);

        $formatTime = function ($t) {
            if (!$t) return '07:30:00';
            $t = trim($t);
            // Handle AM/PM format, e.g. "07:30 AM" or "5:00 PM"
            if (preg_match('/(am|pm)/i', $t)) {
                $timestamp = strtotime($t);
                if ($timestamp !== false) {
                    return date('H:i:00', $timestamp);
                }
            }
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

        $res = $hours->fresh()->toArray();
        $res['venue_open_12']      = $this->formatTo12Hour($hours->venue_open);
        $res['venue_close_12']     = $this->formatTo12Hour($hours->venue_close);
        $res['equipment_open_12']  = $this->formatTo12Hour($hours->equipment_open);
        $res['equipment_close_12'] = $this->formatTo12Hour($hours->equipment_close);

        return response()->json($res);
    }
}
