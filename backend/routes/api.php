<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AvrVenueBookingController;
use App\Http\Controllers\AvrEquipmentBorrowingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\AdminUserController;
// ─── Google OAuth (Socialite) ─────────────────────────────────────────────────
// Step 1: Frontend calls this → receives Google auth URL → redirects browser
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
// Step 2: Google redirects back here → token returned → frontend stores it
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);

// ─── Legacy password login (dev/testing only) ─────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
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
    Route::post('/avr-venue-bookings/{avrVenueBooking}/approve', [\App\Http\Controllers\AvrVenueBookingController::class, 'approve']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/reject', [\App\Http\Controllers\AvrVenueBookingController::class, 'reject']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/cancel', [\App\Http\Controllers\AvrVenueBookingController::class, 'cancel']);
    Route::post('/avr-venue-bookings/{booking}/verify-pin', [\App\Http\Controllers\StaffPinVerificationController::class, 'store']);

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

    Route::post('/inspections', [\App\Http\Controllers\InspectionController::class, 'store']);
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
                ])
        );
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
                ])
        );
    });

    Route::post('/avr-venue-bookings', [\App\Http\Controllers\PublicAvrVenueBookingController::class, 'store']);
    Route::post('/avr-equipment-borrowings', [\App\Http\Controllers\PublicAvrEquipmentBorrowingController::class, 'store']);
    Route::post('/sco-studio-reservations', [\App\Http\Controllers\PublicScoStudioReservationController::class, 'store']);
    
    Route::post('/track', [\App\Http\Controllers\PublicTrackingController::class, 'track']);

    // ─── Email Verification Code (OTP) ────────────────────────────────────────
    Route::post('/send-otp',   [\App\Http\Controllers\PublicOtpController::class, 'send']);
    Route::post('/verify-otp', [\App\Http\Controllers\PublicOtpController::class, 'verify']);
});
