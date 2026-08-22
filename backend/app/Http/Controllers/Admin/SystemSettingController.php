<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CommunicationLog;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class SystemSettingController extends Controller
{
    /**
     * GET /api/public/system-settings
     * Public endpoint returning general info & public equipment borrowing policies.
     */
    public function publicShow(): JsonResponse
    {
        $settings = SystemSetting::getSettings();

        return response()->json([
            'system_name'                    => $settings->system_name,
            'organization_name'              => $settings->organization_name,
            'contact_email'                  => $settings->contact_email,
            'contact_phone'                  => $settings->contact_phone,
            'timezone'                       => $settings->timezone,
            'auto_shift_tomorrow_after_hours'=> $settings->auto_shift_tomorrow_after_hours,
            'allow_advance_equipment_booking'=> $settings->allow_advance_equipment_booking,
            'max_items_per_borrow'           => $settings->max_items_per_borrow,
        ]);
    }

    /**
     * GET /api/admin/system-settings
     * Super Admin endpoint returning full settings including SMTP configuration.
     */
    public function show(): JsonResponse
    {
        $settings = SystemSetting::getSettings();
        return response()->json($settings);
    }

    /**
     * PUT /api/admin/system-settings
     * Update system settings and SMTP configurations.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'system_name'                    => 'nullable|string|max:255',
            'organization_name'              => 'nullable|string|max:255',
            'contact_email'                  => 'nullable|email|max:255',
            'contact_phone'                  => 'nullable|string|max:100',
            'timezone'                       => 'nullable|string|max:100',
            'auto_shift_tomorrow_after_hours'=> 'nullable|boolean',
            'allow_advance_equipment_booking'=> 'nullable|boolean',
            'max_items_per_borrow'           => 'nullable|integer|min:1|max:50',
            'smtp_host'                      => 'nullable|string|max:255',
            'smtp_port'                      => 'nullable|integer|min:1|max:65535',
            'smtp_username'                  => 'nullable|string|max:255',
            'smtp_password'                  => 'nullable|string|max:255',
            'smtp_encryption'                => 'nullable|string|in:tls,ssl,none,null',
            'mail_from_address'              => 'nullable|email|max:255',
            'mail_from_name'                 => 'nullable|string|max:255',
        ]);

        $settings = SystemSetting::getSettings();
        $settings->update($validated);

        return response()->json([
            'message'  => 'System settings updated successfully',
            'settings' => $settings->fresh(),
        ]);
    }

    /**
     * POST /api/admin/system-settings/test-smtp
     * Test SMTP configuration by attempting to send a test message.
     */
    public function testSmtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'test_email' => 'required|email',
        ]);

        $recipient = $validated['test_email'];

        try {
            // Apply current DB SMTP settings
            SystemSetting::configureMailer();

            $settings = SystemSetting::getSettings();
            $systemTitle = $settings->system_name ?: 'FSUU Booking System';
            $orgName = $settings->organization_name ?: 'Father Saturnino Urios University';

            $body = "Greetings from {$orgName}!\n\n"
                  . "This is an automated test email verifying that your dynamic SMTP email configuration in {$systemTitle} is working properly.\n\n"
                  . "Timestamp: " . now()->toFormattedDateString() . " " . now()->toTimeString() . "\n"
                  . "SMTP Host: " . ($settings->smtp_host ?: 'Default') . "\n"
                  . "From: " . ($settings->mail_from_address ?: config('mail.from.address')) . "\n\n"
                  . "If you received this email, your email dispatch system is fully operational.";

            Mail::raw($body, function ($message) use ($recipient, $systemTitle) {
                $message->to($recipient)
                        ->subject("✅ [{$systemTitle}] SMTP Connection Test Successful");
            });

            // Log communication
            CommunicationLog::record([
                'channel'         => 'email',
                'category'        => 'test_email',
                'recipient_name'  => 'Admin Tester',
                'recipient_email' => $recipient,
                'subject'         => "✅ [{$systemTitle}] SMTP Connection Test Successful",
                'message_preview' => "SMTP connection test dispatch to {$recipient}",
                'status'          => 'sent',
            ]);

            return response()->json([
                'success' => true,
                'message' => "✅ Test email sent successfully to {$recipient} via configured SMTP.",
            ]);
        } catch (\Throwable $e) {
            CommunicationLog::record([
                'channel'         => 'email',
                'category'        => 'test_email',
                'recipient_name'  => 'Admin Tester',
                'recipient_email' => $recipient,
                'subject'         => "SMTP Connection Test Failed",
                'message_preview' => "SMTP connection failed: " . $e->getMessage(),
                'status'          => 'failed',
                'error_message'   => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => "❌ SMTP Connection failed: " . $e->getMessage(),
            ], 422);
        }
    }
}
