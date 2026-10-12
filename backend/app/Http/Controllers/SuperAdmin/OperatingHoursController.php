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
        $hours = OperatingHour::getSettings();

        $res = $hours->toArray();
        $res['venue_open_12']      = $this->formatTo12Hour($hours->venue_open);
        $res['venue_close_12']     = $this->formatTo12Hour($hours->venue_close);
        $res['equipment_open_12']  = $this->formatTo12Hour($hours->equipment_open);
        $res['equipment_close_12'] = $this->formatTo12Hour($hours->equipment_close);

        return response()->json($res);
    }

    public function show(Request $request): JsonResponse
    {
        $hours = OperatingHour::getSettings();

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
            'arrival_grace_mins'      => 'required|integer|min:0|max:240',
            'auto_cancel_mins'        => 'required|integer|min:0|max:240',
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

        $hours = OperatingHour::getSettings();
        $hours->update($data);

        $res = $hours->fresh()->toArray();
        $res['venue_open_12']      = $this->formatTo12Hour($hours->venue_open);
        $res['venue_close_12']     = $this->formatTo12Hour($hours->venue_close);
        $res['equipment_open_12']  = $this->formatTo12Hour($hours->equipment_open);
        $res['equipment_close_12'] = $this->formatTo12Hour($hours->equipment_close);

        return response()->json($res);
    }
}
