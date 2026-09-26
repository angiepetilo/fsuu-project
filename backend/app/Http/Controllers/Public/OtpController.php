<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Jobs\SendOtpEmailJob;
use App\Models\EmailVerification;
use App\Models\VerificationPinSetting;
use App\Rules\ActiveDeliverableEmail;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class OtpController extends Controller
{
    /**
     * Generate and send a 6-digit verification code to the provided email OR SMS.
     * POST /api/public/send-otp
     */
    public function send(Request $request): JsonResponse
    {
        $channel = strtolower(trim($request->input('channel', 'email')));
        $isEquipment = $request->input('reservation_type') === 'equipment' || $request->filled('borrow_date');

        $pinSettings = VerificationPinSetting::first();
        $isSystemEnabled = $pinSettings ? (bool)$pinSettings->is_enabled : true;

        if ($channel === 'sms') {
            $smsAllowed = $isSystemEnabled && ($pinSettings ? (
                $isEquipment ? (bool)$pinSettings->equipment_verify_phone : (bool)$pinSettings->venue_verify_phone
            ) : false);

            if (!$smsAllowed) {
                return response()->json([
                    'message'  => 'SMS OTP verification is currently disabled in system settings.',
                    'disabled' => true,
                ], 403);
            }

            $request->validate([
                'phone_number' => ['required', 'string', 'max:20'],
            ]);

            $rawPhone = trim($request->input('phone_number'));
            $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
            if (str_starts_with($cleanPhone, '63')) {
                $cleanPhone = '0' . substr($cleanPhone, 2);
            }
            if (strlen($cleanPhone) === 10 && str_starts_with($cleanPhone, '9')) {
                $cleanPhone = '0' . $cleanPhone;
            }

            if (strlen($cleanPhone) !== 11 || !str_starts_with($cleanPhone, '09')) {
                return response()->json([
                    'message' => 'Please provide a valid 11-digit Philippine mobile number (e.g. 09XXXXXXXXX).',
                ], 422);
            }

            // Upfront Duplicate Reservation Check for Equipment
            if ($request->input('reservation_type') === 'equipment' && $request->input('borrow_date')) {
                $existingEq = \Illuminate\Support\Facades\DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['pending', 'approved', 'ongoing', 'on-going'])
                    ->where('equipment_borrows.contact_number', 'LIKE', "%{$cleanPhone}%")
                    ->where('equipment_borrows.date_of_usage', $request->input('borrow_date'))
                    ->select('tracking_numbers.reference_code', 'tracking_numbers.status')
                    ->first();

                if ($existingEq) {
                    $statusUpper = strtoupper($existingEq->status);
                    return response()->json([
                        'message' => "An active {$statusUpper} equipment borrowing request ({$existingEq->reference_code}) already exists for this mobile number on this date.",
                        'duplicate' => true,
                        'reference_code' => $existingEq->reference_code,
                    ], 422);
                }
            }

            $cooldownKey = 'otp_cooldown_sms_' . $cleanPhone;

            if (Cache::has($cooldownKey)) {
                $remaining = Cache::get($cooldownKey) - time();
                if ($remaining > 0) {
                    return response()->json([
                        'message' => "Please wait {$remaining} seconds before requesting a new SMS verification code.",
                        'cooldown_remaining' => $remaining,
                    ], 429);
                }
            }

            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $expiresAt = now()->addMinutes(10);

            $verification = EmailVerification::create([
                'email'        => $cleanPhone . '@sms.fsuu.local',
                'channel'      => 'sms',
                'phone_number' => $cleanPhone,
                'otp_code'     => $code,
                'expires_at'   => $expiresAt,
                'ip_address'   => $request->ip(),
            ]);

            $cacheKey = 'otp_sms_' . $cleanPhone;
            Cache::put($cacheKey, [
                'code'       => $code,
                'expires_at' => $expiresAt->timestamp,
                'id'         => $verification->id,
            ], $expiresAt);

            Cache::put($cooldownKey, time() + 60, 60);

            // Dispatch SMS via SmsService
            try {
                $smsResult = SmsService::send($cleanPhone, "FSUU AVR: Your 6-digit equipment borrowing verification code is {$code}. Valid for 10 minutes.");
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Failed to send OTP SMS: " . $e->getMessage());
            }

            return response()->json([
                'message'      => 'Verification code sent to your mobile number via SMS.',
                'channel'      => 'sms',
                'phone_number' => $cleanPhone,
                'expires_in'   => 600,
                'cooldown'     => 60,
            ]);
        }

        // Default: Email OTP Flow
        $emailAllowed = $isSystemEnabled && ($pinSettings ? (
            $isEquipment ? (bool)$pinSettings->equipment_verify_email : (bool)$pinSettings->venue_verify_email
        ) : true);

        if (!$emailAllowed) {
            return response()->json([
                'message'  => 'Email OTP verification is currently disabled in system settings.',
                'disabled' => true,
            ], 403);
        }

        $request->validate([
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                function ($attribute, $value, $fail) {
                    $clean = strtolower(trim((string)$value));
                    if (!str_ends_with($clean, '@urios.edu.ph')) {
                        $fail('Only official university email addresses ending with @urios.edu.ph are accepted for verification.');
                    }
                    $username = explode('@', $clean)[0] ?? '';
                    if (preg_match('/[0-9]/', $username)) {
                        $fail('Official institutional emails (@urios.edu.ph) contain no numbers (e.g. student IDs like 202100452@urios.edu.ph are not valid). Please use your official name-based email.');
                    }
                },
                new ActiveDeliverableEmail,
            ],
        ]);

        $email = strtolower(trim($request->input('email')));

        if (!str_ends_with($email, '@urios.edu.ph')) {
            return response()->json([
                'message' => 'Only official university email addresses ending with @urios.edu.ph are accepted for verification.',
            ], 422);
        }

        $username = explode('@', $email)[0] ?? '';
        if (preg_match('/[0-9]/', $username)) {
            return response()->json([
                'message' => 'Official institutional emails (@urios.edu.ph) do not contain numbers (e.g. student ID numbers like 202100452@urios.edu.ph are not valid). Please use your official name-based email.',
            ], 422);
        }

        // Upfront Duplicate Reservation Check (prevents duplicate submission & unnecessary OTP sending)
        $venueId = $request->input('venue_id');
        $dateOfUsage = $request->input('date_of_usage');
        $timeStart = $request->input('time_start');
        $timeEnd = $request->input('time_end');
        $endDate = $request->input('reservation_end_date', $dateOfUsage);

        if ($venueId && $dateOfUsage) {
            $existingVenueBooking = \Illuminate\Support\Facades\DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('venue_bookings.venue_id', $venueId)
                ->whereIn('tracking_numbers.status', ['pending', 'approved', 'ongoing', 'on-going'])
                ->where('venue_bookings.email_address', $email)
                ->where(function ($q) use ($dateOfUsage, $endDate, $timeStart, $timeEnd) {
                    $q->where(function ($sub) use ($dateOfUsage, $timeStart, $timeEnd) {
                        $sub->where('venue_bookings.date_of_usage', '<=', $dateOfUsage)
                            ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$dateOfUsage]);
                        if ($timeStart && $timeEnd) {
                            $sub->where('venue_bookings.time_start', '<', $timeEnd)
                                ->where('venue_bookings.time_end', '>', $timeStart);
                        }
                    })->orWhere(function ($sub2) use ($dateOfUsage, $endDate, $timeStart, $timeEnd) {
                        $sub2->where('venue_bookings.date_of_usage', '<=', $endDate)
                            ->whereRaw('COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?', [$dateOfUsage]);
                        if ($timeStart && $timeEnd) {
                            $sub2->where('venue_bookings.time_start', '<', $timeEnd)
                                ->where('venue_bookings.time_end', '>', $timeStart);
                        }
                    });
                })
                ->select('tracking_numbers.reference_code', 'tracking_numbers.status')
                ->first();

            if ($existingVenueBooking) {
                $statusUpper = strtoupper($existingVenueBooking->status);
                return response()->json([
                    'message' => "You already have an active {$statusUpper} reservation ({$existingVenueBooking->reference_code}) for this venue and schedule. Please track your existing reservation instead of submitting a duplicate.",
                    'duplicate' => true,
                    'reference_code' => $existingVenueBooking->reference_code,
                ], 422);
            }
        }

        if ($request->input('reservation_type') === 'equipment' && $request->input('borrow_date')) {
            $existingEq = \Illuminate\Support\Facades\DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereIn('tracking_numbers.status', ['pending', 'approved', 'ongoing', 'on-going'])
                ->where('equipment_borrows.email_address', $email)
                ->where('equipment_borrows.date_of_usage', $request->input('borrow_date'))
                ->select('tracking_numbers.reference_code', 'tracking_numbers.status')
                ->first();

            if ($existingEq) {
                $statusUpper = strtoupper($existingEq->status);
                return response()->json([
                    'message' => "You already have an active {$statusUpper} equipment borrowing request ({$existingEq->reference_code}) for this borrow date. Please track your existing request instead of submitting a duplicate.",
                    'duplicate' => true,
                    'reference_code' => $existingEq->reference_code,
                ], 422);
            }
        }

        $cooldownKey = 'otp_cooldown_' . hash('sha256', $email);

        // Cooldown check (60 seconds)
        if (Cache::has($cooldownKey)) {
            $remaining = Cache::get($cooldownKey) - time();
            if ($remaining > 0) {
                return response()->json([
                    'message' => "Please wait {$remaining} seconds before requesting a new verification code.",
                    'cooldown_remaining' => $remaining,
                ], 429);
            }
        }

        // Generate a cryptographically strong 6-digit numeric OTP code
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(10);

        // Save to email_verifications table
        $verification = EmailVerification::create([
            'email'      => $email,
            'channel'    => 'email',
            'otp_code'   => $code,
            'expires_at' => $expiresAt,
            'ip_address' => $request->ip(),
        ]);

        // Also cache OTP for fast lookup
        $cacheKey = 'otp_email_' . hash('sha256', $email);
        Cache::put($cacheKey, [
            'code'       => $code,
            'expires_at' => $expiresAt->timestamp,
            'id'         => $verification->id,
        ], $expiresAt);

        // Set 60-second cooldown
        Cache::put($cooldownKey, time() + 60, 60);

        $resType = 'venue';
        if ($request->input('reservation_type') === 'equipment' || $request->has('borrow_date') || $request->input('type') === 'equipment') {
            $resType = 'equipment';
        }

        // Dispatch async email job
        SendOtpEmailJob::dispatch($email, $code, $resType);

        return response()->json([
            'message'    => 'Verification code sent successfully. Please check your inbox.',
            'channel'    => 'email',
            'expires_in' => 600,
            'cooldown'   => 60,
        ]);
    }

    /**
     * Verify the submitted 6-digit code against the recorded email OR phone OTP.
     * POST /api/public/verify-otp
     */
    public function verify(Request $request): JsonResponse
    {
        $channel = strtolower(trim($request->input('channel', 'email')));
        $code = trim($request->input('code') ?? '');

        if (strlen($code) !== 6) {
            return response()->json(['message' => 'Please provide a valid 6-digit verification code.'], 422);
        }

        if ($channel === 'sms' || $request->filled('phone_number')) {
            $rawPhone = trim($request->input('phone_number') ?? '');
            $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
            if (str_starts_with($cleanPhone, '63')) {
                $cleanPhone = '0' . substr($cleanPhone, 2);
            }
            if (strlen($cleanPhone) === 10 && str_starts_with($cleanPhone, '9')) {
                $cleanPhone = '0' . $cleanPhone;
            }

            $record = EmailVerification::where('channel', 'sms')
                ->where('phone_number', $cleanPhone)
                ->whereNull('verified_at')
                ->where('expires_at', '>', now())
                ->latest('id')
                ->first();

            if (! $record) {
                return response()->json([
                    'message' => 'Verification code has expired or was not requested. Please request a new code.',
                ], 422);
            }

            if ($record->otp_code !== $code) {
                return response()->json([
                    'message' => 'Incorrect verification code. Please check your SMS and try again.',
                ], 422);
            }

            $record->update([
                'verified_at' => now(),
                'otp_code'    => 'CONSUMED',
            ]);

            Cache::forget('otp_sms_' . $cleanPhone);

            return response()->json([
                'verified' => true,
                'message'  => 'Mobile number verified successfully via SMS.',
                'channel'  => 'sms',
            ]);
        }

        $request->validate([
            'email' => ['required', 'string', 'email'],
            'code'  => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($request->input('email')));

        // Query active pending verification record
        $record = EmailVerification::where('email', $email)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if (! $record) {
            return response()->json([
                'message' => 'Verification code has expired or was not requested. Please request a new one.',
            ], 422);
        }

        if ($record->otp_code !== $code) {
            return response()->json([
                'message' => 'Incorrect verification code. Please check your email and try again.',
            ], 422);
        }

        // Mark verified and invalidate single-use OTP
        $record->update([
            'verified_at' => now(),
            'otp_code'    => 'CONSUMED',
        ]);

        $cacheKey = 'otp_email_' . hash('sha256', $email);
        Cache::forget($cacheKey);

        return response()->json([
            'verified' => true,
            'message'  => 'Email verified successfully.',
            'channel'  => 'email',
        ]);
    }
}
