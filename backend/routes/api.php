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
                    'location' => $v->office?->name ?? 'FSUU Campus',
                    'capacity' => 100,
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
