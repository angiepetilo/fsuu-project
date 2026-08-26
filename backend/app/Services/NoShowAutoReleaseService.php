<?php

namespace App\Services;

use App\Events\BookingStatusUpdated;
use App\Events\InventoryStockUpdated;
use App\Jobs\SendBookingStatusUpdateJob;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class NoShowAutoReleaseService
{
    /**
     * Run no-show auto-release check for both venue bookings and equipment borrowings.
     * Default grace period: 15 minutes past scheduled start time.
     */
    public function processNoShows(?int $graceMinutes = null): array
    {
        if ($graceMinutes === null) {
            $opHours = \App\Models\OperatingHour::first();
            $graceMinutes = (int)($opHours->auto_cancel_mins ?? $opHours->arrival_grace_mins ?? 15);
        }

        $released = [
            'venue_bookings'      => [],
            'equipment_borrows'   => [],
        ];
        $now = now();
        $cutoffTime = $now->copy()->subMinutes($graceMinutes);

        // 1. Process Venue Bookings
        if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
            try {
                $unclaimedVenueBookings = DB::table('venue_bookings')
                    ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['pending', 'approved'])
                    ->whereNull('venue_bookings.archived_at')
                    ->select(
                        'venue_bookings.id',
                        'venue_bookings.tracking_number_id',
                        'venue_bookings.date_of_usage',
                        'venue_bookings.time_start',
                        'venue_bookings.filer_name',
                        'venue_bookings.email_address',
                        'venue_bookings.equipment_notes',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                foreach ($unclaimedVenueBookings as $vb) {
                    if (empty($vb->date_of_usage) || empty($vb->time_start)) {
                        continue;
                    }

                    $startDtStr = substr($vb->date_of_usage, 0, 10) . ' ' . substr($vb->time_start, 0, 8);
                    try {
                        $startDt = Carbon::parse($startDtStr);
                    } catch (\Throwable $e) {
                        continue;
                    }

                    // If scheduled start time + grace period has passed
                    if ($startDt->lessThanOrEqualTo($cutoffTime)) {
                        $reason = "Automatic cancellation: No-show past grace period ({$graceMinutes} mins).";

                        // Update tracking status to cancelled
                        DB::table('tracking_numbers')
                            ->where('id', $vb->tracking_number_id)
                            ->update(['status' => 'cancelled', 'updated_at' => now()]);

                        if (Schema::hasColumn('venue_bookings', 'status')) {
                            DB::table('venue_bookings')
                                ->where('id', $vb->id)
                                ->update(['status' => 'cancelled', 'updated_at' => now()]);
                        }

                        // Broadcast status update
                        event(new BookingStatusUpdated('venue_booking', $vb->reference_code, 'cancelled', $vb->id, $reason));

                        // Broadcast inventory update so reserved gear is instantly available to others
                        event(new InventoryStockUpdated(null, 'no_show_released', ['reference_code' => $vb->reference_code]));

                        // Dispatch email notification to filer
                        try {
                            $bookingModel = \App\Models\VenueBooking::find($vb->id);
                            if ($bookingModel) {
                                SendBookingStatusUpdateJob::dispatch('venue', $bookingModel, 'cancelled', $reason);
                            }
                        } catch (\Throwable $e) {
                            Log::warning("NoShowAutoRelease: Could not dispatch mail for VenueBooking #{$vb->id}: " . $e->getMessage());
                        }

                        $released['venue_bookings'][] = $vb->reference_code;
                        Log::info("NoShowAutoRelease: Venue booking {$vb->reference_code} auto-cancelled due to no-show past {$graceMinutes}m grace period.");
                    }
                }
            } catch (\Throwable $e) {
                Log::error("NoShowAutoRelease: Error processing venue bookings: " . $e->getMessage());
            }
        }

        // 2. Process Equipment Borrowings
        if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
            try {
                $unclaimedBorrows = DB::table('equipment_borrows')
                    ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereIn('tracking_numbers.status', ['pending', 'approved'])
                    ->whereNull('equipment_borrows.archived_at')
                    ->select(
                        'equipment_borrows.id',
                        'equipment_borrows.tracking_number_id',
                        'equipment_borrows.date_of_usage',
                        'equipment_borrows.time_start',
                        'equipment_borrows.filer_name',
                        'equipment_borrows.email_address',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                foreach ($unclaimedBorrows as $eb) {
                    if (empty($eb->date_of_usage) || empty($eb->time_start)) {
                        continue;
                    }

                    $startDtStr = substr($eb->date_of_usage, 0, 10) . ' ' . substr($eb->time_start, 0, 8);
                    try {
                        $startDt = Carbon::parse($startDtStr);
                    } catch (\Throwable $e) {
                        continue;
                    }

                    if ($startDt->lessThanOrEqualTo($cutoffTime)) {
                        $reason = "Automatic cancellation: No-show past grace period ({$graceMinutes} mins).";

                        DB::table('tracking_numbers')
                            ->where('id', $eb->tracking_number_id)
                            ->update(['status' => 'cancelled', 'updated_at' => now()]);

                        event(new BookingStatusUpdated('equipment_borrow', $eb->reference_code, 'cancelled', $eb->id, $reason));
                        event(new InventoryStockUpdated(null, 'no_show_released', ['reference_code' => $eb->reference_code]));

                        try {
                            $borrowModel = \App\Models\EquipmentBorrow::find($eb->id);
                            if ($borrowModel) {
                                SendBookingStatusUpdateJob::dispatch('equipment', $borrowModel, 'cancelled', $reason);
                            }
                        } catch (\Throwable $e) {
                            Log::warning("NoShowAutoRelease: Could not dispatch mail for EquipmentBorrow #{$eb->id}: " . $e->getMessage());
                        }

                        $released['equipment_borrows'][] = $eb->reference_code;
                        Log::info("NoShowAutoRelease: Equipment borrow {$eb->reference_code} auto-cancelled due to no-show past {$graceMinutes}m grace period.");
                    }
                }
            } catch (\Throwable $e) {
                Log::error("NoShowAutoRelease: Error processing equipment borrows: " . $e->getMessage());
            }
        }

        return $released;
    }
}
