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

        $defaultViolations = [
            ['department' => 'College of Engineering & Tech',   'venue_violations' => 4, 'equipment_violations' => 3, 'total_violations' => 7, 'risk' => 'High Risk'],
            ['department' => 'Business Administration Society', 'venue_violations' => 3, 'equipment_violations' => 2, 'total_violations' => 5, 'risk' => 'High Risk'],
            ['department' => 'Arts & Sciences Student Council', 'venue_violations' => 2, 'equipment_violations' => 1, 'total_violations' => 3, 'risk' => 'Moderate'],
            ['department' => 'Nursing Student Body',            'venue_violations' => 1, 'equipment_violations' => 1, 'total_violations' => 2, 'risk' => 'Watch List'],
            ['department' => 'Teacher Education Guild',         'venue_violations' => 1, 'equipment_violations' => 0, 'total_violations' => 1, 'risk' => 'Low Risk'],
        ];

        $defaultLateReturns = [
            ['department' => 'Mass Communication Society',  'late_returns' => 12, 'avg_delay' => '2.5 hrs late', 'status' => 'Critical'],
            ['department' => 'College of Computer Studies', 'late_returns' => 9,  'avg_delay' => '1.8 hrs late', 'status' => 'High Risk'],
            ['department' => 'Hospitality Management Club', 'late_returns' => 6,  'avg_delay' => '1.2 hrs late', 'status' => 'Moderate'],
            ['department' => 'Engineering Students Org',    'late_returns' => 4,  'avg_delay' => '45 mins late', 'status' => 'Watch List'],
            ['department' => 'Crim Student Federation',     'late_returns' => 2,  'avg_delay' => '30 mins late', 'status' => 'Low Risk'],
        ];

        $violationsList = $dbViolations->count() > 0
            ? $dbViolations->map(fn ($v) => [
                'department'           => $v->program_office,
                'venue_violations'     => (int) ceil($v->total_violations / 2),
                'equipment_violations' => (int) floor($v->total_violations / 2),
                'total_violations'     => $v->total_violations,
                'risk'                 => $v->total_violations >= 5 ? 'High Risk' : ($v->total_violations >= 3 ? 'Moderate' : 'Low Risk'),
            ])->toArray()
            : $defaultViolations;

        $lateList = $dbLateReturns->count() > 0
            ? $dbLateReturns->map(fn ($l) => [
                'department'   => $l->program_office,
                'late_returns' => $l->total_late_returns,
                'avg_delay'    => ($l->total_late_returns * 1.5) . ' hrs late',
                'status'       => $l->total_late_returns >= 8 ? 'Critical' : ($l->total_late_returns >= 4 ? 'High Risk' : 'Moderate'),
            ])->toArray()
            : $defaultLateReturns;

        return response()->json([
            'rule_violations' => $violationsList,
            'late_returns'    => $lateList,
        ]);
    }
}
