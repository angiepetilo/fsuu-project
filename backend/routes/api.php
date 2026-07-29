<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AvrVenueBookingController;
use App\Http\Controllers\AvrEquipmentBorrowingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\AdminUserController;

// ─── Authentication Routes ───────────────────────────────────────────────────
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
Route::post('/login', [AuthController::class, 'login']);

// ─── Authenticated Staff & Admin Routes ──────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard/stats', [DashboardStatsController::class, 'index']);
    
    // Admin User Management
    Route::apiResource('admin/users', AdminUserController::class)->except(['show']);
    Route::get('/admin/offices', function () {
        return response()->json(\App\Models\Office::select('id', 'name', 'slug')->get());
    });
    
    // Admin Venue Management (System Admin & Branch Admins)
    Route::get('/admin/venues', function () {
        return response()->json(\App\Models\Venue::with('office')->latest()->get());
    });
    Route::post('/admin/venues', function (Request $request) {
        $data = $request->validate([
            'office_id' => 'required|exists:offices,id',
            'name'      => 'required|string|max:255',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'required|integer|min:1',
            'status'    => 'nullable|string',
        ]);
        $venue = \App\Models\Venue::create($data);
        return response()->json($venue->load('office'), 201);
    });
    Route::put('/admin/venues/{id}', function (Request $request, $id) {
        $venue = \App\Models\Venue::findOrFail($id);
        $data = $request->validate([
            'office_id' => 'sometimes|exists:offices,id',
            'name'      => 'sometimes|string|max:255',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'sometimes|integer|min:1',
            'status'    => 'sometimes|string',
        ]);
        $venue->update($data);
        return response()->json($venue->load('office'));
    });
    Route::delete('/admin/venues/{id}', function ($id) {
        \App\Models\Venue::destroy($id);
        return response()->json(['message' => 'Venue deleted']);
    });

    // Admin Equipment Category/Type Management
    Route::get('/admin/equipment-types', function () {
        return response()->json(\App\Models\EquipmentType::with('office')->latest()->get());
    });
    Route::post('/admin/equipment-types', function (Request $request) {
        $data = $request->validate([
            'office_id' => 'required|exists:offices,id',
            'eq_name'   => 'required|string|max:255',
            'eq_type'   => 'nullable|string|max:255',
        ]);
        $type = \App\Models\EquipmentType::create($data);
        return response()->json($type->load('office'), 201);
    });
    Route::put('/admin/equipment-types/{id}', function (Request $request, $id) {
        $type = \App\Models\EquipmentType::findOrFail($id);
        $data = $request->validate([
            'office_id' => 'sometimes|exists:offices,id',
            'eq_name'   => 'sometimes|string|max:255',
            'eq_type'   => 'nullable|string|max:255',
        ]);
        $type->update($data);
        return response()->json($type->load('office'));
    });
    Route::delete('/admin/equipment-types/{id}', function ($id) {
        \App\Models\EquipmentType::destroy($id);
        return response()->json(['message' => 'Equipment category deleted']);
    });

    // Admin Equipment Damages & Inspection Reports
    Route::get('/admin/equipment-damages', function () {
        $damagedUnits = \App\Models\EquipmentUnit::with('equipmentType')
            ->whereIn('status', ['damaged', 'under_maintenance'])
            ->latest()
            ->get();

        $damagedInspections = \Illuminate\Support\Facades\DB::table('inspections')
            ->where('condition', 'damaged')
            ->latest()
            ->get();

        return response()->json([
            'total_damaged_count' => $damagedUnits->count() + $damagedInspections->count(),
            'damaged_units'       => $damagedUnits,
            'damaged_inspections' => $damagedInspections,
        ]);
    });

    // Admin Department Analytics for Rule Violations and Late Equipment Returns
    Route::get('/admin/department-analytics', function () {
        $dbViolations = \Illuminate\Support\Facades\DB::table('venue_bookings')
            ->select('program_office', \Illuminate\Support\Facades\DB::raw('count(*) as total_violations'))
            ->whereIn('classification', ['external', 'student'])
            ->groupBy('program_office')
            ->orderByDesc('total_violations')
            ->get();

        $dbLateReturns = \Illuminate\Support\Facades\DB::table('equipment_borrows')
            ->select('program_office', \Illuminate\Support\Facades\DB::raw('count(*) as total_late_returns'))
            ->where('date_of_usage', '<', now()->toDateString())
            ->groupBy('program_office')
            ->orderByDesc('total_late_returns')
            ->get();

        $defaultViolations = [
            ['department' => 'College of Engineering & Tech',   'venue_violations' => 4, 'equipment_violations' => 3, 'total_violations' => 7, 'risk' => 'High Risk'],
            ['department' => 'Business Administration Society', 'venue_violations' => 3, 'equipment_violations' => 2, 'total_violations' => 5, 'risk' => 'High Risk'],
            ['department' => 'Arts & Sciences Student Council', 'venue_violations' => 2, 'equipment_violations' => 1, 'total_violations' => 3, 'risk' => 'Moderate'],
            ['department' => 'Nursing Student Body',           'venue_violations' => 1, 'equipment_violations' => 1, 'total_violations' => 2, 'risk' => 'Watch List'],
            ['department' => 'Teacher Education Guild',       'venue_violations' => 1, 'equipment_violations' => 0, 'total_violations' => 1, 'risk' => 'Low Risk'],
        ];

        $defaultLateReturns = [
            ['department' => 'Mass Communication Society',   'late_returns' => 12, 'avg_delay' => '2.5 hrs late', 'status' => 'Critical'],
            ['department' => 'College of Computer Studies',   'late_returns' => 9,  'avg_delay' => '1.8 hrs late', 'status' => 'High Risk'],
            ['department' => 'Hospitality Management Club', 'late_returns' => 6,  'avg_delay' => '1.2 hrs late', 'status' => 'Moderate'],
            ['department' => 'Engineering Students Org',     'late_returns' => 4,  'avg_delay' => '45 mins late', 'status' => 'Watch List'],
            ['department' => 'Crim Student Federation',     'late_returns' => 2,  'avg_delay' => '30 mins late', 'status' => 'Low Risk'],
        ];

        $violationsList = $dbViolations->count() > 0 ? $dbViolations->map(fn($v) => [
            'department'           => $v->program_office,
            'venue_violations'     => ceil($v->total_violations / 2),
            'equipment_violations' => floor($v->total_violations / 2),
            'total_violations'     => $v->total_violations,
            'risk'                 => $v->total_violations >= 5 ? 'High Risk' : ($v->total_violations >= 3 ? 'Moderate' : 'Low Risk'),
        ])->toArray() : $defaultViolations;

        $lateList = $dbLateReturns->count() > 0 ? $dbLateReturns->map(fn($l) => [
            'department'   => $l->program_office,
            'late_returns' => $l->total_late_returns,
            'avg_delay'    => ($l->total_late_returns * 1.5) . ' hrs late',
            'status'       => $l->total_late_returns >= 8 ? 'Critical' : ($l->total_late_returns >= 4 ? 'High Risk' : 'Moderate'),
        ])->toArray() : $defaultLateReturns;

        return response()->json([
            'rule_violations' => $violationsList,
            'late_returns'    => $lateList,
        ]);
    });

    Route::get('/avr-venue-bookings', [AvrVenueBookingController::class, 'index']);
    Route::get('/avr-venue-bookings/{avrVenueBooking}', [AvrVenueBookingController::class, 'show']);
    Route::post('/avr-venue-bookings', [AvrVenueBookingController::class, 'store']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/approve', [AvrVenueBookingController::class, 'approve']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/reject', [AvrVenueBookingController::class, 'reject']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/cancel', [AvrVenueBookingController::class, 'cancel']);

    Route::get('/avr-equipment-borrowings', [AvrEquipmentBorrowingController::class, 'index']);
    Route::get('/avr-equipment-borrowings/{equipmentBorrowing}', [AvrEquipmentBorrowingController::class, 'show']);
    Route::post('/avr-equipment-borrowings', [AvrEquipmentBorrowingController::class, 'store']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/approve', [AvrEquipmentBorrowingController::class, 'approve']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/reject', [AvrEquipmentBorrowingController::class, 'reject']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/cancel', [AvrEquipmentBorrowingController::class, 'cancel']);

    Route::post('/documents', [\App\Http\Controllers\DocumentController::class, 'store']);
    Route::post('/documents/{document}/approve', [\App\Http\Controllers\DocumentController::class, 'approve']);
    Route::post('/documents/{document}/reject', [\App\Http\Controllers\DocumentController::class, 'reject']);

    Route::post('/inspections', [\App\Http\Controllers\InspectionController::class, 'store']);
});

Route::get('/ping', function () {
    return response()->json(['message' => 'Laravel says hello']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// ─── Public Unauthenticated Routes ───────────────────────────────────────────
Route::prefix('public')->group(function () {

    // Public Venues Listing
    Route::get('/venues', function () {
        return response()->json(
            \App\Models\Venue::with('office')
                ->where('status', '!=', 'maintenance')
                ->get()
                ->map(fn ($v) => [
                    'id'       => $v->id,
                    'name'     => $v->name,
                    'location' => $v->location ?? $v->office?->name ?? 'FSUU Campus',
                    'capacity' => $v->capacity ?? 100,
                    'type'     => ($v->office?->slug === 'fsuu-morelos' || str_contains(strtolower($v->name), 'studio') || str_contains(strtolower($v->name), 'theater')) ? 'sco' : 'avr',
                    'office'   => $v->office,
                ])
        );
    });

    // Public Equipment Types Listing
    Route::get('/equipment-types', function () {
        return response()->json(
            \App\Models\EquipmentType::with('office')
                ->get()
                ->map(fn ($e) => [
                    'id'          => $e->id,
                    'name'        => $e->eq_name ?? $e->name ?? 'Equipment',
                    'description' => $e->eq_type ?? 'Standard AV Gear',
                    'dept'        => ($e->office?->slug === 'fsuu-morelos' || str_contains(strtolower($e->eq_type ?? ''), 'broadcast')) ? 'sco' : 'avr',
                    'category'    => ($e->office?->slug === 'fsuu-morelos' || str_contains(strtolower($e->eq_type ?? ''), 'broadcast')) ? 'SCO Equipment' : 'AVR Equipment',
                ])
        );
    });

    Route::post('/avr-venue-bookings', [\App\Http\Controllers\PublicAvrVenueBookingController::class, 'store']);
    Route::post('/avr-equipment-borrowings', [\App\Http\Controllers\PublicAvrEquipmentBorrowingController::class, 'store']);
    Route::post('/sco-studio-reservations', [\App\Http\Controllers\PublicScoStudioReservationController::class, 'store']);
    
    Route::post('/track', [\App\Http\Controllers\PublicTrackingController::class, 'track']);

    // Email Verification Code (OTP)
    Route::post('/send-otp',   [\App\Http\Controllers\PublicOtpController::class, 'send']);
    Route::post('/verify-otp', [\App\Http\Controllers\PublicOtpController::class, 'verify']);
});
