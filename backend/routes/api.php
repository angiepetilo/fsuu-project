<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AvrVenueBookingController;
use App\Http\Controllers\AvrEquipmentBorrowingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\VenueClosureController;
// ─── Google OAuth (Socialite) ─────────────────────────────────────────────────
// Step 1: Frontend calls this → receives Google auth URL → redirects browser
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
// Step 2: Google redirects back here → token returned → frontend stores it
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);

// ─── Legacy password login (dev/testing only) ─────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ─── Forgot Password (3-step: send OTP → verify → reset) ──────────────────────
Route::post('/forgot-password/send-otp',   [\App\Http\Controllers\ForgotPasswordController::class, 'sendOtp']);
Route::post('/forgot-password/verify-otp', [\App\Http\Controllers\ForgotPasswordController::class, 'verifyOtp']);
Route::post('/forgot-password/reset',      [\App\Http\Controllers\ForgotPasswordController::class, 'resetPassword']);


// Public bootstrap endpoint for instant catalog hydration
Route::get('/bootstrap/public', [\App\Http\Controllers\BootstrapController::class, 'publicBootstrap']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bootstrap', [\App\Http\Controllers\BootstrapController::class, 'index']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard/stats', [DashboardStatsController::class, 'index']);
    
    // Admin User Management
    Route::apiResource('admin/users', AdminUserController::class)->except(['show']);
    Route::get('/admin/offices', function () {
        return response()->json(\App\Models\Office::select('id', 'name', 'code', 'type')->get());
    });
    
    Route::get('/avr-venue-bookings', [AvrVenueBookingController::class, 'index']);
    Route::get('/avr-venue-bookings/{avrVenueBooking}', [AvrVenueBookingController::class, 'show']);
    Route::post('/avr-venue-bookings', [\App\Http\Controllers\AvrVenueBookingController::class, 'store']);
    Route::put('/avr-venue-bookings/{avrVenueBooking}', [\App\Http\Controllers\AvrVenueBookingController::class, 'update']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/approve', [\App\Http\Controllers\AvrVenueBookingController::class, 'approve']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/reject', [\App\Http\Controllers\AvrVenueBookingController::class, 'reject']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/cancel', [\App\Http\Controllers\AvrVenueBookingController::class, 'cancel']);
    Route::post('/avr-venue-bookings/{booking}/verify-pin', [\App\Http\Controllers\StaffPinVerificationController::class, 'store']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/notify-missing', [\App\Http\Controllers\AvrVenueBookingController::class, 'notifyMissing']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/set-ready', [\App\Http\Controllers\AvrVenueBookingController::class, 'setReady']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/set-ongoing', [\App\Http\Controllers\AvrVenueBookingController::class, 'setOngoing']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/complete', [\App\Http\Controllers\AvrVenueBookingController::class, 'complete']);

    Route::apiResource('equipment-borrowing-units', EquipmentBorrowingUnitController::class);
    Route::apiResource('equipment-types', EquipmentTypeController::class);
    Route::apiResource('equipment-units', EquipmentUnitController::class);
    Route::apiResource('programs', ProgramController::class);
    Route::apiResource('venue-closures', VenueClosureController::class);

    Route::get('/avr-equipment-borrowings', [AvrEquipmentBorrowingController::class, 'index']);
    Route::get('/avr-equipment-borrowings/{equipmentBorrowing}', [AvrEquipmentBorrowingController::class, 'show']);
    Route::post('/avr-equipment-borrowings', [\App\Http\Controllers\AvrEquipmentBorrowingController::class, 'store']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/approve', [\App\Http\Controllers\AvrEquipmentBorrowingController::class, 'approve']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/reject', [\App\Http\Controllers\AvrEquipmentBorrowingController::class, 'reject']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/cancel', [\App\Http\Controllers\AvrEquipmentBorrowingController::class, 'cancel']);
    Route::post('/avr-equipment-borrowings/{borrowing}/items/{item}/assign', [\App\Http\Controllers\AvrEquipmentBorrowingAssignmentController::class, 'store']);

    Route::get('/sco-studio-reservations', [\App\Http\Controllers\ScoStudioReservationController::class, 'index']);
    Route::get('/sco-studio-reservations/{scoStudioReservation}', [\App\Http\Controllers\ScoStudioReservationController::class, 'show']);
    Route::post('/sco-studio-reservations', [\App\Http\Controllers\ScoStudioReservationController::class, 'store']);
    Route::post('/sco-studio-reservations/{scoStudioReservation}/approve', [\App\Http\Controllers\ScoStudioReservationController::class, 'approve']);
    Route::post('/sco-studio-reservations/{scoStudioReservation}/reject', [\App\Http\Controllers\ScoStudioReservationController::class, 'reject']);
    Route::post('/sco-studio-reservations/{scoStudioReservation}/cancel', [\App\Http\Controllers\ScoStudioReservationController::class, 'cancel']);

    Route::post('/documents', [\App\Http\Controllers\DocumentController::class, 'store']);
    Route::post('/documents/{document}/approve', [\App\Http\Controllers\DocumentController::class, 'approve']);
    Route::post('/documents/{document}/reject', [\App\Http\Controllers\DocumentController::class, 'reject']);
    Route::get('/documents/{document}/download', [\App\Http\Controllers\DocumentController::class, 'download']);

    Route::post('/inspections', [\App\Http\Controllers\InspectionController::class, 'store']);

    // ─── AVR System Admin Routes ───────────────────────────────────────────────
    // Equipment Units (individual physical units with barcodes)
    Route::get('/avr/equipment-units',           [\App\Http\Controllers\AvrEquipmentUnitController::class, 'index']);
    Route::post('/avr/equipment-units',          [\App\Http\Controllers\AvrEquipmentUnitController::class, 'store']);
    Route::put('/avr/equipment-units/{unit}',    [\App\Http\Controllers\AvrEquipmentUnitController::class, 'update']);
    Route::delete('/avr/equipment-units/{unit}', [\App\Http\Controllers\AvrEquipmentUnitController::class, 'destroy']);

    // Equipment Types / Categories
    Route::get('/avr/equipment-types',           [\App\Http\Controllers\AvrEquipmentTypeController::class, 'index']);
    Route::post('/avr/equipment-types',          [\App\Http\Controllers\AvrEquipmentTypeController::class, 'store']);
    Route::put('/avr/equipment-types/{type}',    [\App\Http\Controllers\AvrEquipmentTypeController::class, 'update']);
    Route::delete('/avr/equipment-types/{type}', [\App\Http\Controllers\AvrEquipmentTypeController::class, 'destroy']);

    // Venue Management (with calendar data)
    Route::get('/avr/venues',                    [\App\Http\Controllers\AvrVenueManageController::class, 'index']);
    Route::post('/avr/venues',                   [\App\Http\Controllers\AvrVenueManageController::class, 'store']);
    Route::put('/avr/venues/{venue}',            [\App\Http\Controllers\AvrVenueManageController::class, 'update']);
    Route::delete('/avr/venues/{venue}',         [\App\Http\Controllers\AvrVenueManageController::class, 'destroy']);
    Route::get('/avr/venues/calendar-events',    [\App\Http\Controllers\AvrVenueManageController::class, 'calendarEvents']);

    // Combined History Log
    Route::get('/avr/history-log',               [\App\Http\Controllers\AvrHistoryController::class, 'index']);

    // Inventory Summary
    Route::get('/avr/inventory',                 [\App\Http\Controllers\AvrInventoryController::class, 'index']);

    // Notifications (system-level)
    Route::get('/avr/notifications',             [\App\Http\Controllers\AvrNotificationController::class, 'index']);
    Route::post('/avr/notifications/{id}/read',  [\App\Http\Controllers\AvrNotificationController::class, 'markRead']);

    // Reports
    Route::get('/avr/reports',                   [\App\Http\Controllers\AvrReportController::class, 'index']);
    Route::post('/avr/reports/email',            [\App\Http\Controllers\AvrReportController::class, 'sendEmail']);

    // Operation Hours & Settings
    Route::get('/avr/settings',                  [\App\Http\Controllers\AvrSettingsController::class, 'index']);
    Route::post('/avr/settings',                 [\App\Http\Controllers\AvrSettingsController::class, 'update']);
});

Route::get('/ping', function () {
    return response()->json(['message' => 'Laravel says hello']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('throttle:10,1')->prefix('public')->group(function () {

    // ─── Public Venues Listing ────────────────────────────────────────────────
    Route::get('/venues', function () {
        return response()->json(
            \App\Models\Venue::with('office')
                ->where('is_active', true)
                ->get()
                ->map(fn ($v) => [
                    'id'       => $v->id,
                    'name'     => $v->name,
                    'location' => $v->location,
                    'capacity' => $v->capacity,
                    'type'     => $v->office?->type,   // 'avr' or 'sco'
                    'office'   => $v->office?->name,
                    'image_url' => $v->image_path ? url('storage/' . $v->image_path) : null,
                ])
        );
    });

    Route::get('/programs', function () {
        return response()->json(\App\Models\Program::all());
    });

    // ─── Public Equipment Types Listing ───────────────────────────────────────
    Route::get('/equipment-types', function () {
        return response()->json(
            \App\Models\EquipmentType::with('office')
                ->where('is_active', true)
                ->get()
                ->map(fn ($e) => [
                    'id'          => $e->id,
                    'name'        => $e->name,
                    'description' => $e->description,
                    'dept'        => $e->office?->type, // 'avr' or 'sco'
                    'category'    => $e->office?->type === 'avr' ? 'AVR Equipment' : 'SCO Equipment',
                    'total'       => $e->total_quantity,
                    'available'   => $e->availableUnitsCount(),
                    'image_url'   => $e->image_path ? url('storage/' . $e->image_path) : null,
                ])
        );
    });

    Route::post('/avr-venue-bookings', [\App\Http\Controllers\PublicAvrVenueBookingController::class, 'store']);
    Route::post('/avr-equipment-borrowings', [\App\Http\Controllers\PublicAvrEquipmentBorrowingController::class, 'store']);
    Route::post('/sco-studio-reservations', [\App\Http\Controllers\PublicScoStudioReservationController::class, 'store']);
    
    Route::post('/track', [\App\Http\Controllers\PublicTrackingController::class, 'track']);
    Route::get('/requisition-slip/{type}/{referenceCode}', [\App\Http\Controllers\RequisitionSlipController::class, 'download']);
    Route::post('/documents', [\App\Http\Controllers\PublicDocumentController::class, 'store']);

    // ─── Email Verification Code (OTP) ────────────────────────────────────────
    Route::post('/send-otp',   [\App\Http\Controllers\PublicOtpController::class, 'send']);
    Route::post('/verify-otp', [\App\Http\Controllers\PublicOtpController::class, 'verify']);
});
