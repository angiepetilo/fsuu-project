<?php

namespace App\Services;

use App\Jobs\SendBookingStatusUpdateJob;
use App\Models\EquipmentBorrow;
use App\Models\VenueBooking;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class OverdueAndExceededAlertService
{
    /**
     * Check active reservations that have exceeded their scheduled time or passed due,
     * and automatically dispatch notification emails to requestors.
     *
     * Runs every 5 minutes via scheduler.
     * Notifications fire immediately once end time has passed (any amount of time).
     * Cache keys are scoped per day so that reminders can repeat daily for extended overdue items.
     */
    public function processAlerts(): array
    {
        $notified = [
            'venue_exceeded'     => [],
            'equipment_exceeded' => [],
            'equipment_overdue'  => [],
        ];

        $now = Carbon::now();

        // ─────────────────────────────────────────────────────────────────
        // 1. Venue Bookings — notify when ON-GOING and past end time
        // ─────────────────────────────────────────────────────────────────
        try {
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $activeVenues = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['ongoing', 'on-going'])   // only truly on-going; NOT 'approved'
                    ->whereNull('venue_bookings.archived_at')
                    ->select(
                        'venue_bookings.id',
                        'venue_bookings.date_of_usage',
                        'venue_bookings.reservation_end_date',
                        'venue_bookings.time_end',
                        'venue_bookings.email_address',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                Log::info("OverdueAndExceededAlertService: Found {$activeVenues->count()} on-going venue booking(s) to check.");

                foreach ($activeVenues as $vb) {
                    // Use reservation_end_date if present (multi-day bookings), else date_of_usage
                    $endDate = $vb->reservation_end_date ?: $vb->date_of_usage;
                    $timeEnd = $vb->time_end ?: '17:00:00';

                    if (empty($endDate)) {
                        Log::warning("OverdueAndExceededAlertService: Venue booking ID {$vb->id} has no end date, skipping.");
                        continue;
                    }

                    $endDtStr = substr($endDate, 0, 10) . ' ' . substr($timeEnd, 0, 8);
                    try {
                        $endCarbon = Carbon::parse($endDtStr);
                    } catch (\Throwable $e) {
                        Log::warning("OverdueAndExceededAlertService: Could not parse venue end datetime '{$endDtStr}' for ID {$vb->id}.");
                        continue;
                    }

                    Log::info("OverdueAndExceededAlertService: Venue {$vb->reference_code} (ID {$vb->id}) — end: {$endCarbon} vs now: {$now}");

                    if ($now->greaterThan($endCarbon)) {
                        $minutesPast = max(1, abs((int) $now->diffInMinutes($endCarbon)));
                        $statusType  = 'past_due';

                        // Cache key scoped per day so extended overdue can re-notify next day
                        $cacheKey = "alert_venue_{$statusType}_{$vb->id}_" . $now->format('Y-m-d');

                        if (!Cache::has($cacheKey)) {
                            $bookingModel = VenueBooking::with(['venue', 'trackingNumber'])->find($vb->id);
                            if ($bookingModel) {
                                $refCode = $bookingModel->trackingNumber?->reference_code ?? "TRK-{$bookingModel->id}";
                                $venueName = $bookingModel->venue?->name ?? 'AVR Facility';

                                $remarks = "Your scheduled venue reservation for {$refCode} ({$venueName}) has ended (was scheduled until " . $endCarbon->format('h:i A') . ", past due by {$minutesPast} minute(s)). This reservation is now officially marked as Past Due. Please conclude your activity, vacate the facility, and coordinate turnover inspection with AVR custodial staff immediately.";

                                SendBookingStatusUpdateJob::dispatch(
                                    'venue',
                                    $bookingModel,
                                    $statusType,
                                    $remarks
                                );
                                Cache::put($cacheKey, true, now()->addHours(6));
                                $notified['venue_exceeded'][] = $vb->reference_code;

                                Log::info("OverdueAndExceededAlertService: [{$statusType}] email dispatched for Venue {$vb->reference_code} (ID {$vb->id}), {$minutesPast} min past due. Email: {$vb->email_address}");
                            }
                        } else {
                            Log::info("OverdueAndExceededAlertService: Skipping Venue {$vb->reference_code} (ID {$vb->id}) — already notified today (cache: {$cacheKey}).");
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("OverdueAndExceededAlertService error on venue bookings: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. Equipment Borrowings — notify when ON-GOING and past end time
        // ─────────────────────────────────────────────────────────────────
        try {
            if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
                $activeBorrows = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['ongoing', 'on-going'])
                    ->whereNull('equipment_borrows.archived_at')
                    ->select(
                        'equipment_borrows.id',
                        'equipment_borrows.date_of_usage',
                        'equipment_borrows.time_end',
                        'equipment_borrows.email_address',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                Log::info("OverdueAndExceededAlertService: Found {$activeBorrows->count()} on-going equipment borrow(s) to check.");

                foreach ($activeBorrows as $eb) {
                    $endDate = $eb->date_of_usage;
                    $timeEnd = $eb->time_end ?: '17:00:00';

                    if (!$endDate) {
                        Log::warning("OverdueAndExceededAlertService: Equipment borrow ID {$eb->id} has no date_of_usage, skipping.");
                        continue;
                    }

                    $endDtStr = substr($endDate, 0, 10) . ' ' . substr($timeEnd, 0, 8);

                    try {
                        $endCarbon = Carbon::parse($endDtStr);
                    } catch (\Throwable $e) {
                        Log::warning("OverdueAndExceededAlertService: Could not parse equipment end datetime '{$endDtStr}' for ID {$eb->id}.");
                        continue;
                    }

                    Log::info("OverdueAndExceededAlertService: Equipment {$eb->reference_code} (ID {$eb->id}) — end: {$endCarbon} vs now: {$now}");

                    if ($now->greaterThan($endCarbon)) {
                        $minutesPast = max(1, abs((int) $now->diffInMinutes($endCarbon)));
                        $statusType  = 'late_return';

                        // Cache key scoped per day so each day gets a fresh notification
                        $cacheKey = "alert_eq_{$statusType}_{$eb->id}_" . $now->format('Y-m-d');

                        if (!Cache::has($cacheKey)) {
                            $borrowModel = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber'])->find($eb->id);
                            if ($borrowModel) {
                                $refCode = $borrowModel->trackingNumber?->reference_code ?? "EQ-{$borrowModel->id}";

                                SendBookingStatusUpdateJob::dispatch(
                                    'equipment',
                                    $borrowModel,
                                    $statusType,
                                    null
                                );
                                Cache::put($cacheKey, true, now()->addHours(6));

                                $notified['equipment_overdue'][] = $eb->reference_code;

                                Log::info("OverdueAndExceededAlertService: [{$statusType}] email dispatched for Equipment {$eb->reference_code} (ID {$eb->id}), {$minutesPast} min past due. Email: {$eb->email_address}");
                            }
                        } else {
                            Log::info("OverdueAndExceededAlertService: Skipping Equipment {$eb->reference_code} (ID {$eb->id}) — already notified today (cache: {$cacheKey}).");
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("OverdueAndExceededAlertService error on equipment borrows: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
        }

        return $notified;
    }
}
