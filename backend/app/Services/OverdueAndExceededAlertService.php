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
     */
    public function processAlerts(): array
    {
        $notified = [
            'venue_exceeded'     => [],
            'equipment_exceeded' => [],
            'equipment_overdue'  => [],
        ];

        $now = Carbon::now();

        // 1. Process Venue Bookings that have exceeded end time
        try {
            if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
                $activeVenues = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['ongoing', 'on-going', 'approved'])
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

                foreach ($activeVenues as $vb) {
                    $endDate = $vb->reservation_end_date ?: $vb->date_of_usage;
                    $timeEnd = $vb->time_end ?: '17:00:00';

                    if (empty($endDate)) {
                        continue;
                    }

                    $endDtStr = substr($endDate, 0, 10) . ' ' . substr($timeEnd, 0, 8);
                    try {
                        $endCarbon = Carbon::parse($endDtStr);
                    } catch (\Throwable $e) {
                        continue;
                    }

                    // If currently past the scheduled end datetime
                    if ($now->greaterThan($endCarbon)) {
                        $cacheKey = "alert_venue_exceeded_{$vb->id}";
                        if (!Cache::has($cacheKey)) {
                            $bookingModel = VenueBooking::with(['venue', 'trackingNumber'])->find($vb->id);
                            if ($bookingModel) {
                                SendBookingStatusUpdateJob::dispatch(
                                    'venue',
                                    $bookingModel,
                                    'exceed_end_time',
                                    'Your scheduled venue reservation has exceeded its end time. Please conclude your activity or coordinate with the AVR Administrator immediately.'
                                );
                                Cache::put($cacheKey, true, now()->addHours(6));
                                $notified['venue_exceeded'][] = $vb->reference_code;
                                Log::info("OverdueAndExceededAlertService: Exceeded end time email sent for Venue {$vb->reference_code}");
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("OverdueAndExceededAlertService error on venue bookings: " . $e->getMessage());
        }

        // 2. Process Equipment Borrowings that have exceeded end time or passed due
        try {
            if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
                $activeBorrows = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['ongoing', 'on-going', 'approved'])
                    ->select(
                        'equipment_borrows.id',
                        'equipment_borrows.date_of_usage',
                        'equipment_borrows.reservation_end_date',
                        'equipment_borrows.time_end',
                        'equipment_borrows.end_datetime',
                        'equipment_borrows.start_datetime',
                        'equipment_borrows.email_address',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                foreach ($activeBorrows as $eb) {
                    $endDt = $eb->end_datetime;
                    if (!$endDt) {
                        $endDate = $eb->reservation_end_date ?: $eb->date_of_usage;
                        $timeEnd = $eb->time_end ?: '17:00:00';
                        if ($endDate) {
                            $endDt = substr($endDate, 0, 10) . ' ' . substr($timeEnd, 0, 8);
                        }
                    }

                    if (!$endDt) {
                        continue;
                    }

                    try {
                        $endCarbon = Carbon::parse($endDt);
                    } catch (\Throwable $e) {
                        continue;
                    }

                    if ($now->greaterThan($endCarbon)) {
                        $minutesPast = $now->diffInMinutes($endCarbon);
                        $isOverdue = $minutesPast >= 60; // 1+ hour past is considered overdue
                        $statusType = $isOverdue ? 'overdue' : 'exceed end time';

                        $cacheKey = "alert_eq_{$statusType}_{$eb->id}";
                        if (!Cache::has($cacheKey)) {
                            $borrowModel = EquipmentBorrow::with(['items.equipmentType', 'trackingNumber'])->find($eb->id);
                            if ($borrowModel) {
                                $remarks = $isOverdue
                                    ? "Your equipment borrowing period is {$minutesPast} minutes past due. Please return all physical equipment units to the AVR Center immediately."
                                    : "Your scheduled borrowing duration has ended. Please proceed to turnover all physical equipment units.";

                                SendBookingStatusUpdateJob::dispatch(
                                    'equipment',
                                    $borrowModel,
                                    $statusType,
                                    $remarks
                                );
                                Cache::put($cacheKey, true, now()->addHours(6));

                                if ($isOverdue) {
                                    $notified['equipment_overdue'][] = $eb->reference_code;
                                } else {
                                    $notified['equipment_exceeded'][] = $eb->reference_code;
                                }
                                Log::info("OverdueAndExceededAlertService: {$statusType} email sent for Equipment {$eb->reference_code}");
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("OverdueAndExceededAlertService error on equipment borrows: " . $e->getMessage());
        }

        return $notified;
    }
}
