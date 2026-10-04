<?php

namespace App\Services;

use App\Jobs\SendBookingStatusUpdateJob;
use App\Models\VenueBooking;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class VenueReminderService
{
    /**
     * Send a one-time "your venue is booked soon" reminder for APPROVED venue bookings
     * whose start time falls within the next $minutesBefore minutes.
     *
     * Only 'approved' bookings are considered: once a booking is on-going it has already
     * been checked in, and cancelled / rejected / completed ones must never be reminded.
     *
     * @return array{venue_reminded: string[]}
     */
    public function processReminders(int $minutesBefore = 120): array
    {
        $notified = ['venue_reminded' => []];

        if (! Schema::hasTable('venue_bookings') || ! Schema::hasTable('tracking_numbers')) {
            return $notified;
        }

        $now = Carbon::now();

        try {
            $candidates = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->where('tracking_numbers.status', 'approved')
                ->whereNull('venue_bookings.archived_at')
                ->whereDate('venue_bookings.date_of_usage', '>=', $now->copy()->toDateString())
                ->select(
                    'venue_bookings.id',
                    'venue_bookings.date_of_usage',
                    'venue_bookings.time_start',
                    'tracking_numbers.reference_code'
                )
                ->get();

            foreach ($candidates as $row) {
                if (empty($row->date_of_usage)) {
                    continue;
                }

                try {
                    $start = Carbon::parse(substr((string) $row->date_of_usage, 0, 10) . ' ' . substr((string) ($row->time_start ?: '08:00:00'), 0, 8));
                } catch (\Throwable $e) {
                    continue;
                }

                // Only inside the reminder window and strictly before the start time.
                if ($now->greaterThanOrEqualTo($start) || $now->diffInMinutes($start) > $minutesBefore) {
                    continue;
                }

                $cacheKey = "reminder_venue_{$row->id}";
                if (Cache::has($cacheKey)) {
                    continue;
                }

                $booking = VenueBooking::with(['venue', 'trackingNumber'])->find($row->id);
                if (! $booking) {
                    continue;
                }

                SendBookingStatusUpdateJob::dispatch('venue', $booking, 'reminder');
                Cache::put($cacheKey, true, now()->addDay());
                $notified['venue_reminded'][] = $row->reference_code;
                Log::info("VenueReminderService: reminder dispatched for venue booking {$row->reference_code}");
            }
        } catch (\Throwable $e) {
            Log::error('VenueReminderService error: ' . $e->getMessage());
        }

        return $notified;
    }
}
