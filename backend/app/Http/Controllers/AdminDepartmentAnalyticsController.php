<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDepartmentAnalyticsController extends Controller
{
    public function index(): JsonResponse
    {
        $dbViolations = DB::table('venue_bookings')
            ->select('program_office', DB::raw('count(*) as total_violations'))
            ->whereIn('classification', ['external', 'student'])
            ->groupBy('program_office')
            ->orderByDesc('total_violations')
            ->get();

        $dbLateReturns = DB::table('equipment_borrows')
            ->select('program_office', DB::raw('count(*) as total_late_returns'))
            ->where('date_of_usage', '<', now()->toDateString())
            ->groupBy('program_office')
            ->orderByDesc('total_late_returns')
            ->get();

        $violationsList = $dbViolations->count() > 0
            ? $dbViolations->map(fn ($v) => [
                'department'           => $v->program_office,
                'venue_violations'     => (int) ceil($v->total_violations / 2),
                'equipment_violations' => (int) floor($v->total_violations / 2),
                'total_violations'     => $v->total_violations,
                'risk'                 => $v->total_violations >= 5 ? 'High Risk' : ($v->total_violations >= 3 ? 'Moderate' : 'Low Risk'),
            ])->toArray()
            : [];

        $lateList = $dbLateReturns->count() > 0
            ? $dbLateReturns->map(fn ($l) => [
                'department'   => $l->program_office,
                'late_returns' => $l->total_late_returns,
                'avg_delay'    => ($l->total_late_returns * 1.5) . ' hrs late',
                'status'       => $l->total_late_returns >= 8 ? 'Critical' : ($l->total_late_returns >= 4 ? 'High Risk' : 'Moderate'),
            ])->toArray()
            : [];

        return response()->json([
            'rule_violations' => $violationsList,
            'late_returns'    => $lateList,
        ]);
    }
}
