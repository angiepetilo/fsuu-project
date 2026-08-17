<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ─── Controllers ──────────────────────────────────────────────────────────────
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;

// ─── SuperAdmin Controllers ───────────────────────────────────────────────────
use App\Http\Controllers\SuperAdmin\OfficeController;
use App\Http\Controllers\SuperAdmin\LocationController;
use App\Http\Controllers\SuperAdmin\DepartmentController;
use App\Http\Controllers\SuperAdmin\OperatingHoursController;
use App\Http\Controllers\SuperAdmin\VerificationPinController;
use App\Http\Controllers\SuperAdmin\BookingRequirementController;
use App\Http\Controllers\SuperAdmin\NotificationController as SuperAdminNotificationController;

// ─── Admin Controllers ────────────────────────────────────────────────────────
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VenueController;
use App\Http\Controllers\Admin\EquipmentTypeController;
use App\Http\Controllers\Admin\EquipmentUnitController;
use App\Http\Controllers\Admin\EquipmentDamageController;
use App\Http\Controllers\Admin\DepartmentAnalyticsController;
use App\Http\Controllers\Admin\HistoryLogController;
use App\Http\Controllers\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Admin\DashboardStatsController;
use App\Http\Controllers\Admin\CategoryRequestController;
use App\Http\Controllers\Admin\VenueAvailabilityController;

// ─── Bookings & Borrowings (Internal) ─────────────────────────────────────────
use App\Http\Controllers\VenueBookingController;
use App\Http\Controllers\EquipmentBorrowingController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\InspectionController;

// ─── Public Controllers ───────────────────────────────────────────────────────
use App\Http\Controllers\Public\ListingController;
use App\Http\Controllers\Public\VenueBookingController as PublicVenueBookingController;
use App\Http\Controllers\Public\EquipmentBorrowingController as PublicEquipmentBorrowingController;
use App\Http\Controllers\Public\TrackingController;
use App\Http\Controllers\Public\OtpController;

// ─── Public Operating Hours & Overrides ─────────────────────────────────────────
Route::get('/public/operating-hours', [OperatingHoursController::class, 'publicShow']);
Route::get('/public/venue-overrides', [VenueAvailabilityController::class, 'publicOverrides']);

// ─── Authentication ────────────────────────────────────────────────────────────
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/auth/invite/{token}', [AuthController::class, 'getInviteDetails']);
Route::post('/auth/activate', [AuthController::class, 'activateAccount'])->middleware('throttle:auth-activate');

// ─── Authenticated Routes (Staff & Admin) ─────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);
    Route::get('/dashboard/stats', [DashboardStatsController::class, 'index']);

    // ── Admin: Users & Offices ─────────────────────────────────────────────────
    Route::post('/admin/users/{id}/resend-invite', [UserController::class, 'resendInvite']);
    Route::apiResource('admin/users', UserController::class)->except(['show']);
    Route::get('/admin/offices',         [OfficeController::class, 'index']);
    Route::post('/admin/offices',        [OfficeController::class, 'store']);
    Route::put('/admin/offices/{id}',    [OfficeController::class, 'update']);
    Route::delete('/admin/offices/{id}', [OfficeController::class, 'destroy']);

    // ── Admin: Locations ───────────────────────────────────────────────────────
    Route::get('/admin/locations',         [LocationController::class, 'index']);
    Route::post('/admin/locations',        [LocationController::class, 'store']);
    Route::put('/admin/locations/{id}',    [LocationController::class, 'update']);
    Route::delete('/admin/locations/{id}', [LocationController::class, 'destroy']);

    // ── Admin: Venues ──────────────────────────────────────────────────────────
    Route::get('/admin/venues',         [VenueController::class, 'index']);
    Route::post('/admin/venues',        [VenueController::class, 'store']);
    Route::put('/admin/venues/{id}',    [VenueController::class, 'update']);
    Route::delete('/admin/venues/{id}', [VenueController::class, 'destroy']);

    // ── Admin: Venue Availability Calendar ────────────────────────────────────
    Route::get('/admin/venue-availability',         [VenueAvailabilityController::class, 'index']);
    Route::get('/admin/venues-list',                [VenueAvailabilityController::class, 'venuesList']);
    Route::post('/admin/venue-availability',        [VenueAvailabilityController::class, 'store']);
    Route::delete('/admin/venue-availability/{id}', [VenueAvailabilityController::class, 'destroy']);

    // ── Admin: Equipment Types & Units ─────────────────────────────────────────
    Route::get('/admin/equipment-types',         [EquipmentTypeController::class, 'index']);
    Route::post('/admin/equipment-types',        [EquipmentTypeController::class, 'store']);
    Route::put('/admin/equipment-types/{id}',    [EquipmentTypeController::class, 'update']);
    Route::delete('/admin/equipment-types/{id}', [EquipmentTypeController::class, 'destroy']);

    Route::get('/admin/category-requests',                [CategoryRequestController::class, 'index']);
    Route::post('/admin/category-requests',               [CategoryRequestController::class, 'store']);
    Route::post('/admin/category-requests/{id}/approve',  [CategoryRequestController::class, 'approve']);
    Route::post('/admin/category-requests/{id}/reject',   [CategoryRequestController::class, 'reject']);

    Route::get('/admin/equipment-units',         [EquipmentUnitController::class, 'index']);
    Route::post('/admin/equipment-units',        [EquipmentUnitController::class, 'store']);
    Route::put('/admin/equipment-units/{id}',    [EquipmentUnitController::class, 'update']);
    Route::delete('/admin/equipment-units/{id}', [EquipmentUnitController::class, 'destroy']);

    // ── Admin: Analytics & Reports ────────────────────────────────────────────
    Route::get('/admin/equipment-damages',    [EquipmentDamageController::class, 'index']);
    Route::get('/admin/department-analytics', [DepartmentAnalyticsController::class, 'index']);

    // ── Admin: History Log (with type filter + soft-delete) ───────────────────
    Route::get('/admin/history-log',                        [HistoryLogController::class, 'index']);
    Route::post('/admin/history-log/undo',                 [HistoryLogController::class, 'undo']);
    Route::delete('/admin/history-log/venue/{id}',      [HistoryLogController::class, 'destroyVenue']);
    Route::delete('/admin/history-log/equipment/{id}',  [HistoryLogController::class, 'destroyEquipment']);

    // ── Admin & SysAd: Notifications (office-scoped & global) ───────────────────
    Route::get('/admin/notifications',                 [AdminNotificationController::class, 'index']);
    Route::post('/admin/notifications/mark-as-read',   [AdminNotificationController::class, 'markAsRead']);
    Route::post('/admin/notifications/mark-all-read',  [AdminNotificationController::class, 'markAllRead']);

    Route::get('/sysad/notifications',                 [SuperAdminNotificationController::class, 'index']);
    Route::post('/sysad/notifications/mark-as-read',   [SuperAdminNotificationController::class, 'markAsRead']);
    Route::post('/sysad/notifications/mark-all-read',  [SuperAdminNotificationController::class, 'markAllRead']);

    // ── Admin: Departments ────────────────────────────────────────────────────
    Route::get('/admin/departments',         [DepartmentController::class, 'index']);
    Route::post('/admin/departments',        [DepartmentController::class, 'store']);
    Route::put('/admin/departments/{id}',    [DepartmentController::class, 'update']);
    Route::delete('/admin/departments/{id}', [DepartmentController::class, 'destroy']);

    // ── Admin: Operating Hours & Verification PIN ────────────────────────────
    Route::get('/admin/operating-hours',       [OperatingHoursController::class, 'show']);
    Route::put('/admin/operating-hours',       [OperatingHoursController::class, 'update']);
    Route::get('/admin/verification-pin',      [VerificationPinController::class, 'show']);
    Route::put('/admin/verification-pin',      [VerificationPinController::class, 'update']);

    // ── Admin: Booking Requirements & Fee Matrix ──────────────────────────────
    Route::get('/admin/booking-requirements',         [BookingRequirementController::class, 'index']);
    Route::post('/admin/booking-requirements',        [BookingRequirementController::class, 'store']);
    Route::put('/admin/booking-requirements/{id}',    [BookingRequirementController::class, 'update']);
    Route::delete('/admin/booking-requirements/{id}', [BookingRequirementController::class, 'destroy']);

    Route::get('/admin/fee-matrix',         [\App\Http\Controllers\SuperAdmin\FeeMatrixController::class, 'index']);
    Route::post('/admin/fee-matrix',        [\App\Http\Controllers\SuperAdmin\FeeMatrixController::class, 'store']);
    Route::put('/admin/fee-matrix/{id}',    [\App\Http\Controllers\SuperAdmin\FeeMatrixController::class, 'update']);
    Route::delete('/admin/fee-matrix/{id}', [\App\Http\Controllers\SuperAdmin\FeeMatrixController::class, 'destroy']);

    // ── Admin: Academic Terms & Archiving (TiDB) ──────────────────────────────
    Route::get('/admin/academic-terms',                   [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'index']);
    Route::post('/admin/academic-terms',                  [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'store']);
    Route::get('/admin/academic-terms/active',            [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'active']);
    Route::put('/admin/academic-terms/{id}',              [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'update']);
    Route::post('/admin/academic-terms/{id}/activate',     [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'activate']);
    Route::delete('/admin/academic-terms/{id}',           [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'destroy']);
    Route::post('/admin/academic-terms/close-term',       [\App\Http\Controllers\SuperAdmin\AcademicTermController::class, 'closeTerm']);

    // ── Venue Bookings ─────────────────────────────────────────────────────────
    Route::get('/avr-venue-bookings',                              [VenueBookingController::class, 'index']);
    Route::get('/avr-venue-bookings/{avrVenueBooking}',            [VenueBookingController::class, 'show']);
    Route::post('/avr-venue-bookings',                             [VenueBookingController::class, 'store']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/approve',   [VenueBookingController::class, 'approve']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/reject',    [VenueBookingController::class, 'reject']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/ongoing',           [VenueBookingController::class, 'ongoing']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/post-inspection',   [VenueBookingController::class, 'postInspection']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/complete',          [VenueBookingController::class, 'complete']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/undo',      [VenueBookingController::class, 'undo']);
    Route::post('/avr-venue-bookings/{avrVenueBooking}/cancel',    [VenueBookingController::class, 'cancel']);
    Route::post('/avr-venue-bookings/{id}/resend-email',           [VenueBookingController::class, 'resendEmail']);
    Route::put('/avr-venue-bookings/{avrVenueBooking}/assign-units', [VenueBookingController::class, 'assignUnits']);
    Route::put('/avr-venue-bookings/{avrVenueBooking}/override',     [VenueBookingController::class, 'override']);

    // ── Equipment Borrowings ───────────────────────────────────────────────────
    Route::get('/avr-equipment-borrowings',                               [EquipmentBorrowingController::class, 'index']);
    Route::get('/avr-equipment-borrowings/{equipmentBorrowing}',          [EquipmentBorrowingController::class, 'show']);
    Route::post('/avr-equipment-borrowings',                              [EquipmentBorrowingController::class, 'store']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/approve', [EquipmentBorrowingController::class, 'approve']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/reject',  [EquipmentBorrowingController::class, 'reject']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/ongoing', [EquipmentBorrowingController::class, 'ongoing']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/complete',[EquipmentBorrowingController::class, 'complete']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/undo',    [EquipmentBorrowingController::class, 'undo']);
    Route::post('/avr-equipment-borrowings/{equipmentBorrowing}/cancel',  [EquipmentBorrowingController::class, 'cancel']);
    Route::post('/avr-equipment-borrowings/{id}/resend-email',            [EquipmentBorrowingController::class, 'resendEmail']);
    Route::put('/avr-equipment-borrowings/{equipmentBorrowing}/assign-units', [EquipmentBorrowingController::class, 'assignUnits']);
    Route::put('/avr-equipment-borrowings/{equipmentBorrowing}/override',     [EquipmentBorrowingController::class, 'override']);

    // ── Documents & Inspections ────────────────────────────────────────────────
    Route::post('/documents',                    [DocumentController::class, 'store']);
    Route::post('/documents/{document}/approve', [DocumentController::class, 'approve']);
    Route::post('/documents/{document}/reject',  [DocumentController::class, 'reject']);
    Route::get('/inspections',                   [InspectionController::class, 'index']);
    Route::post('/inspections',                  [InspectionController::class, 'store']);
});

// ─── Utility ──────────────────────────────────────────────────────────────────
Route::get('/ping', fn () => response()->json(['message' => 'Laravel says hello']));
Route::get('/test-email', function (Request $request) {
    $to = $request->query('to', 'angie.petilo@urios.edu.ph');
    try {
        \Illuminate\Support\Facades\Mail::raw("FSUU System Test Email sent at " . now()->toDateTimeString(), function ($message) use ($to) {
            $message->to($to)->subject("FSUU System Mail Test");
        });
        return response()->json(['status' => 'success', 'message' => "Test email successfully sent to {$to}"]);
    } catch (\Throwable $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});
Route::get('/user', fn (Request $request) => $request->user())->middleware('auth:sanctum');

// ─── Public (Unauthenticated) Routes ──────────────────────────────────────────
Route::prefix('public')->group(function () {

    // Listings for public forms & availability calendar
    Route::get('/venues',          [ListingController::class, 'venues']);
    Route::get('/equipment-types', [ListingController::class, 'equipmentTypes']);
    Route::get('/departments',     [ListingController::class, 'departments']);
    Route::get('/venue-bookings',  [ListingController::class, 'venueBookings']);

    // Venue availability for public booking calendar
    Route::get('/venue-availability', [VenueAvailabilityController::class, 'index']);

    // Booking requirements for public booking form & landing page
    Route::get('/booking-requirements', [BookingRequirementController::class, 'publicIndex']);

    // Form submissions
    Route::post('/avr-venue-bookings',       [PublicVenueBookingController::class, 'store'])->middleware('throttle:public-submissions');
    Route::post('/avr-equipment-borrowings', [PublicEquipmentBorrowingController::class, 'store'])->middleware('throttle:public-submissions');

    // Tracking & OTP & PIN Verification
    Route::post('/track',                     [TrackingController::class, 'track'])->middleware('throttle:tracking');
    Route::post('/send-otp',                  [OtpController::class, 'send'])->middleware('throttle:otp');
    Route::post('/verify-otp',                [OtpController::class, 'verify'])->middleware('throttle:otp');
    Route::get('/verification-pin-settings',  [VerificationPinController::class, 'publicSettings']);
    Route::post('/verify-pin',                [VerificationPinController::class, 'verifyPin'])->middleware('throttle:otp');
});
