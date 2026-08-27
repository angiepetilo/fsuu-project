<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ─── Controllers ──────────────────────────────────────────────────────────────
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;

// ─── SuperAdmin Controllers ───────────────────────────────────────────────────
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

// ─── Lightweight Health Check / Keep-Alive for Render Uptime ──────────────────
Route::get('/health', function () {
    return response()->json([
        'status'    => 'ok',
        'timestamp' => now()->toIso8601String(),
        'app'       => config('app.name', 'FSUU Booking System')
    ]);
});

// ─── Public Operating Hours, Overrides & System Settings ────────────────────
Route::get('/public/operating-hours', [OperatingHoursController::class, 'publicShow']);
Route::get('/public/venue-overrides', [VenueAvailabilityController::class, 'publicOverrides']);
Route::get('/public/system-settings', [\App\Http\Controllers\Admin\SystemSettingController::class, 'publicShow']);

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
    Route::post('/verify-password', [AuthController::class, 'verifyPassword']);
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);
    Route::get('/dashboard/stats', [DashboardStatsController::class, 'index']);

    // ── Admin: Users ───────────────────────────────────────────────────────────
    Route::post('/admin/users/{id}/resend-invite', [UserController::class, 'resendInvite']);
    Route::apiResource('admin/users', UserController::class)->except(['show']);

    // ── Admin: Venues ──────────────────────────────────────────────────────────
    Route::get('/admin/venues',         [VenueController::class, 'index']);
    Route::get('/admin/venues/{id}',    [VenueController::class, 'show']);
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

    Route::get('/admin/equipment-units',         [EquipmentUnitController::class, 'index']);
    Route::post('/admin/equipment-units',        [EquipmentUnitController::class, 'store']);
    Route::put('/admin/equipment-units/{id}',    [EquipmentUnitController::class, 'update']);
    Route::delete('/admin/equipment-units/{id}', [EquipmentUnitController::class, 'destroy']);

    // ── Admin: Analytics & Reports ────────────────────────────────────────────
    Route::get('/admin/equipment-damages',    [EquipmentDamageController::class, 'index']);
    Route::get('/admin/department-analytics', [DepartmentAnalyticsController::class, 'index']);
    Route::post('/admin/send-report-email', function (Request $request) {
        $validated = $request->validate([
            'recipient' => 'required|email',
            'subject'   => 'nullable|string',
            'notes'     => 'nullable|string',
            'content'   => 'nullable|string',
            'tab'       => 'nullable|string',
            'scope'     => 'nullable|string',
        ]);

        $to = trim($validated['recipient']);
        $subject = $validated['subject'] ?: 'FSUU AVRC Official Audit Report';
        $notes = $validated['notes'] ?? '';
        $content = $validated['content'] ?? '';
        $scope = $validated['scope'] ?? 'FSUU Campus';
        $tabTitle = match($validated['tab'] ?? '') {
            'booking_borrowing' => 'Booking & Borrowing Report',
            'breaches'          => 'Rule & Late Return Violations Report',
            'inventory'         => 'Equipment Inventory & Stock Audit Report',
            default             => 'Official Resource Report'
        };

        // Dynamically apply database-configured SMTP settings
        \App\Models\SystemSetting::configureMailer();

        $htmlBody = '
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
            .header h1 { margin: 0 0 6px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
            .header p { margin: 0; font-size: 12px; opacity: 0.9; }
            .content { padding: 24px; font-size: 13px; line-height: 1.6; }
            .meta-box { background: #f1f5f9; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 12px; }
            .notes-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; white-space: pre-wrap; }
            .report-text { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 11.5px; white-space: pre-wrap; word-break: break-word; }
            .footer { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Father Saturnino Urios University</h1>
              <p>Audio-Visual Resource Center (AVRC) • ' . htmlspecialchars($tabTitle) . '</p>
            </div>
            <div class="content">
              <div class="meta-box">
                <div><strong>Report Scope:</strong> ' . htmlspecialchars($scope) . '</div>
                <div><strong>Date Generated:</strong> ' . now()->toFormattedDateString() . ' (' . now()->toTimeString() . ')</div>
                <div><strong>Subject:</strong> ' . htmlspecialchars($subject) . '</div>
              </div>' .
              ($notes ? '<div class="notes-box"><strong>Executive Notes & Observations:</strong><br>' . nl2br(htmlspecialchars($notes)) . '</div>' : '') .
              '<div class="report-text">' . htmlspecialchars($content) . '</div>
            </div>
            <div class="footer">
              This is an official automated audit report generated from the FSUU Facilities & Equipment Booking System.
            </div>
          </div>
        </body>
        </html>';

        $plainBody = "Father Saturnino Urios University\nAudio-Visual Resource Center (AVRC)\n\n"
                   . "{$tabTitle}\n"
                   . "Scope: {$scope}\n"
                   . "Date: " . now()->toFormattedDateString() . "\n"
                   . "Subject: {$subject}\n\n"
                   . ($notes ? "=== EXECUTIVE NOTES & OBSERVATIONS ===\n{$notes}\n\n" : "")
                   . "=== REPORT DATA ===\n" . $content;

        $mailSent = false;
        $errorMessage = null;

        try {
            \Illuminate\Support\Facades\Mail::send([], [], function ($message) use ($to, $subject, $htmlBody, $plainBody) {
                $message->to($to)
                        ->subject($subject)
                        ->html($htmlBody)
                        ->text($plainBody);
            });
            $mailSent = true;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Default send-report-email failed: {$e->getMessage()}. Retrying via SMTP...");
            try {
                \Illuminate\Support\Facades\Mail::mailer('smtp')->send([], [], function ($message) use ($to, $subject, $htmlBody, $plainBody) {
                    $message->to($to)
                            ->subject($subject)
                            ->html($htmlBody)
                            ->text($plainBody);
                });
                $mailSent = true;
            } catch (\Throwable $err) {
                $errorMessage = $err->getMessage();
                \Illuminate\Support\Facades\Log::error("send-report-email failed on all mailers: " . $errorMessage);
            }
        }

        try {
            \App\Models\CommunicationLog::record([
                'channel'         => 'email',
                'category'        => 'report_dispatch',
                'recipient_name'  => 'Report Recipient',
                'recipient_email' => $to,
                'subject'         => $subject,
                'message_preview' => substr($plainBody, 0, 150),
                'status'          => $mailSent ? 'sent' : 'failed',
                'error_message'   => $errorMessage,
            ]);
        } catch (\Throwable $t) {}

        if ($mailSent) {
            return response()->json([
                'success' => true,
                'message' => "Official report successfully sent to {$to}",
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Email sending failed: " . ($errorMessage ?: "Could not connect to configured mail server. Please check SMTP settings."),
            'error'   => $errorMessage,
        ], 500);
    });

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
    Route::get('/sysad/audit-logs',                     [\App\Http\Controllers\SuperAdmin\AuditLogController::class, 'index']);

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

    // ── Admin & SuperAdmin: System Settings, Dynamic SMTP & Communication Logs ───
    Route::get('/admin/system-settings',             [\App\Http\Controllers\Admin\SystemSettingController::class, 'show']);
    Route::put('/admin/system-settings',             [\App\Http\Controllers\Admin\SystemSettingController::class, 'update']);
    Route::post('/admin/system-settings/test-smtp',  [\App\Http\Controllers\Admin\SystemSettingController::class, 'testSmtp']);
    Route::get('/admin/communication-logs',          [\App\Http\Controllers\Admin\CommunicationLogController::class, 'index']);

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
    Route::post('/avr-venue-bookings/{avrVenueBooking}/upload-document', [VenueBookingController::class, 'uploadDocument']);
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
    Route::post('/avr-equipment-borrowings/{id}/send-overdue-sms',        [EquipmentBorrowingController::class, 'sendOverdueSms']);
    Route::post('/avr-equipment-borrowings/{id}/send-return-reminder',    [EquipmentBorrowingController::class, 'sendReturnReminder']);
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
Route::get('/test-sms', function (Request $request) {
    $phone = $request->query('phone', '09123456789');
    $apiKey = config('services.iprogsms.api_key') ?: env('IPROG_SMS_API_KEY');
    
    if (empty($apiKey)) {
        return response()->json([
            'status'     => 'warning',
            'configured' => false,
            'message'    => 'IPROG_SMS_API_KEY is missing in Render environment variables.',
        ], 200);
    }
    
    $res = \App\Services\SmsService::send($phone, "FSUU Booking System SMS Verification sent at " . now()->toDateTimeString());
    return response()->json([
        'status'           => $res ? 'success' : 'dispatched',
        'configured'       => true,
        'gateway_response' => $res,
    ]);
});
Route::get('/user', fn (Request $request) => $request->user()->load(['role']))->middleware('auth:sanctum');

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
