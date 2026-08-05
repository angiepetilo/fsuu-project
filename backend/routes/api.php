<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ─── Controllers ──────────────────────────────────────────────────────────────
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\DashboardStatsController;

// Admin: Core
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminOfficeController;
use App\Http\Controllers\AdminLocationController;
use App\Http\Controllers\AdminVenueController;
use App\Http\Controllers\AdminEquipmentTypeController;
use App\Http\Controllers\AdminEquipmentUnitController;
use App\Http\Controllers\AdminEquipmentDamageController;
use App\Http\Controllers\AdminDepartmentAnalyticsController;
use App\Http\Controllers\AdminHistoryLogController;
use App\Http\Controllers\AdminNotificationController;

// Admin: New (Phase 1)
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\OperatingHoursController;
use App\Http\Controllers\BookingRequirementController;
use App\Http\Controllers\VenueAvailabilityController;

// Bookings & Borrowings
use App\Http\Controllers\AvrVenueBookingController;
use App\Http\Controllers\AvrEquipmentBorrowingController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\InspectionController;

// SysAd
use App\Http\Controllers\SysadNotificationController;

// Public
use App\Http\Controllers\PublicListingController;
use App\Http\Controllers\PublicAvrVenueBookingController;
use App\Http\Controllers\PublicAvrEquipmentBorrowingController;
use App\Http\Controllers\PublicScoStudioReservationController;
use App\Http\Controllers\PublicTrackingController;
use App\Http\Controllers\PublicOtpController;

// ─── Public Operating Hours & Overrides ─────────────────────────────────────────
Route::get('/public/operating-hours', [OperatingHoursController::class, 'publicShow']);
Route::get('/public/venue-overrides', [VenueAvailabilityController::class, 'publicOverrides']);

// ─── Authentication ────────────────────────────────────────────────────────────
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
Route::post('/login', [AuthController::class, 'login']);

// ─── Authenticated Routes (Staff & Admin) ─────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard/stats', [DashboardStatsController::class, 'index']);

    // ── Admin: Users & Offices ─────────────────────────────────────────────────
    Route::apiResource('admin/users', AdminUserController::class)->except(['show']);
    Route::get('/admin/offices',         [AdminOfficeController::class, 'index']);
    Route::post('/admin/offices',        [AdminOfficeController::class, 'store']);
    Route::put('/admin/offices/{id}',    [AdminOfficeController::class, 'update']);
    Route::delete('/admin/offices/{id}', [AdminOfficeController::class, 'destroy']);

    // ── Admin: Locations ───────────────────────────────────────────────────────
    Route::get('/admin/locations',         [AdminLocationController::class, 'index']);
    Route::post('/admin/locations',        [AdminLocationController::class, 'store']);
    Route::put('/admin/locations/{id}',    [AdminLocationController::class, 'update']);
    Route::delete('/admin/locations/{id}', [AdminLocationController::class, 'destroy']);

    // ── Admin: Venues ──────────────────────────────────────────────────────────
    Route::get('/admin/venues',         [AdminVenueController::class, 'index']);
    Route::post('/admin/venues',        [AdminVenueController::class, 'store']);
    Route::put('/admin/venues/{id}',    [AdminVenueController::class, 'update']);
    Route::delete('/admin/venues/{id}', [AdminVenueController::class, 'destroy']);

    // ── Admin: Venue Availability Calendar ────────────────────────────────────
    Route::get('/admin/venue-availability',         [VenueAvailabilityController::class, 'index']);
    Route::get('/admin/venues-list',                [VenueAvailabilityController::class, 'venuesList']);
    Route::post('/admin/venue-availability',        [VenueAvailabilityController::class, 'store']);
    Route::delete('/admin/venue-availability/{id}', [VenueAvailabilityController::class, 'destroy']);

    // ── Admin: Equipment Types & Units ─────────────────────────────────────────
    Route::get('/admin/equipment-types',         [AdminEquipmentTypeController::class, 'index']);
    Route::post('/admin/equipment-types',        [AdminEquipmentTypeController::class, 'store']);
    Route::put('/admin/equipment-types/{id}',    [AdminEquipmentTypeController::class, 'update']);
    Route::delete('/admin/equipment-types/{id}', [AdminEquipmentTypeController::class, 'destroy']);

    Route::get('/admin/equipment-units',         [AdminEquipmentUnitController::class, 'index']);
    Route::post('/admin/equipment-units',        [AdminEquipmentUnitController::class, 'store']);
    Route::put('/admin/equipment-units/{id}',    [AdminEquipmentUnitController::class, 'update']);
    Route::delete('/admin/equipment-units/{id}', [AdminEquipmentUnitController::class, 'destroy']);

    // ── Admin: Analytics & Reports ────────────────────────────────────────────
    Route::get('/admin/equipment-damages',    [AdminEquipmentDamageController::class, 'index']);
    Route::get('/admin/department-analytics', [AdminDepartmentAnalyticsController::class, 'index']);

    // ── Admin: History Log (with type filter + soft-delete) ───────────────────
    Route::get('/admin/history-log',                        [AdminHistoryLogController::class, 'index']);
    Route::delete('/admin/history-log/venue/{id}',      [AdminHistoryLogController::class, 'destroyVenue']);
    Route::delete('/admin/history-log/equipment/{id}',  [AdminHistoryLogController::class, 'destroyEquipment']);

    // ── Admin: Notifications (office-scoped) ──────────────────────────────────
    Route::get('/admin/notifications', [AdminNotificationController::class, 'index']);

    // ── Admin: Departments ────────────────────────────────────────────────────
    Route::get('/admin/departments',         [DepartmentController::class, 'index']);
    Route::post('/admin/departments',        [DepartmentController::class, 'store']);
    Route::put('/admin/departments/{id}',    [DepartmentController::class, 'update']);
    Route::delete('/admin/departments/{id}', [DepartmentController::class, 'destroy']);

    // ── Admin: Operating Hours ────────────────────────────────────────────────
    Route::get('/admin/operating-hours',  [OperatingHoursController::class, 'show']);
    Route::put('/admin/operating-hours',  [OperatingHoursController::class, 'update']);

    // ── Admin: Booking Requirements ───────────────────────────────────────────
    Route::get('/admin/booking-requirements',         [BookingRequirementController::class, 'index']);
    Route::post('/admin/booking-requirements',        [BookingRequirementController::class, 'store']);
    Route::put('/admin/booking-requirements/{id}',    [BookingRequirementController::class, 'update']);
    Route::delete('/admin/booking-requirements/{id}', [BookingRequirementController::class, 'destroy']);

    // ── Venue Bookings ─────────────────────────────────────────────────────────
    Route::get('/avr-venue-bookings',                              [AvrVenueBookingController::class, 'index']);
    Route::get('/avr-venue-bookings/{avrVenueBooking}',            [AvrVenueBookingController::class, 'show']);
    Route::post('/avr-venue-bookings',                             [AvrVenueBookingController::class, 'store']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/approve',   [AvrVenueBookingController::class, 'approve']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/reject',    [AvrVenueBookingController::class, 'reject']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/ongoing',   [AvrVenueBookingController::class, 'ongoing']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/complete',  [AvrVenueBookingController::class, 'complete']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/undo',      [AvrVenueBookingController::class, 'undo']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/cancel',    [AvrVenueBookingController::class, 'cancel']);
    Route::post('/avr-venue-bookings/{id}/resend-email',           [AvrVenueBookingController::class, 'resendEmail']);

    // ── Equipment Borrowings ───────────────────────────────────────────────────
    Route::get('/avr-equipment-borrowings',                               [AvrEquipmentBorrowingController::class, 'index']);
    Route::get('/avr-equipment-borrowings/{equipmentBorrowing}',          [AvrEquipmentBorrowingController::class, 'show']);
    Route::post('/avr-equipment-borrowings',                              [AvrEquipmentBorrowingController::class, 'store']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/approve', [AvrEquipmentBorrowingController::class, 'approve']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/reject',  [AvrEquipmentBorrowingController::class, 'reject']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/ongoing', [AvrEquipmentBorrowingController::class, 'ongoing']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/complete',[AvrEquipmentBorrowingController::class, 'complete']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/undo',    [AvrEquipmentBorrowingController::class, 'undo']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/cancel',  [AvrEquipmentBorrowingController::class, 'cancel']);
    Route::post('/avr-equipment-borrowings/{id}/resend-email',            [AvrEquipmentBorrowingController::class, 'resendEmail']);

    // ── Documents & Inspections ────────────────────────────────────────────────
    Route::post('/documents',                    [DocumentController::class, 'store']);
    Route::post('/documents/{document}/approve', [DocumentController::class, 'approve']);
    Route::post('/documents/{document}/reject',  [DocumentController::class, 'reject']);
    Route::post('/inspections',                  [InspectionController::class, 'store']);

    // ── SysAd (global-scope notifications) ────────────────────────────────────
    Route::get('/sysad/notifications', [SysadNotificationController::class, 'index']);
});

// ─── Utility ──────────────────────────────────────────────────────────────────
Route::get('/ping', fn () => response()->json(['message' => 'Laravel says hello']));
Route::get('/user', fn (Request $request) => $request->user())->middleware('auth:sanctum');

// ─── Public (Unauthenticated) Routes ──────────────────────────────────────────
Route::prefix('public')->group(function () {

    // Listings for public forms & availability calendar
    Route::get('/venues',          [PublicListingController::class, 'venues']);
    Route::get('/equipment-types', [PublicListingController::class, 'equipmentTypes']);
    Route::get('/departments',     [PublicListingController::class, 'departments']);
    Route::get('/venue-bookings',  [PublicListingController::class, 'venueBookings']);

    // Venue availability for public booking calendar
    Route::get('/venue-availability', [VenueAvailabilityController::class, 'index']);

    // Booking requirements for public booking form & landing page
    Route::get('/booking-requirements', [BookingRequirementController::class, 'publicIndex']);

    // Form submissions
    Route::post('/avr-venue-bookings',       [PublicAvrVenueBookingController::class, 'store']);
    Route::post('/avr-equipment-borrowings', [PublicAvrEquipmentBorrowingController::class, 'store']);
    Route::post('/sco-studio-reservations',  [PublicScoStudioReservationController::class, 'store']);

    // Tracking & OTP
    Route::post('/track',       [PublicTrackingController::class, 'track'])->middleware('throttle:10,1');
    Route::post('/send-otp',    [PublicOtpController::class, 'send']);
    Route::post('/verify-otp',  [PublicOtpController::class, 'verify']);
});
