<?php

namespace App\Services;

use App\Events\BookingStatusUpdated;
use App\Events\InventoryStockUpdated;
use App\Jobs\SendBookingStatusUpdateJob;
use App\Models\EquipmentBorrow;
use App\Models\EquipmentUnit;
use App\Models\OperatingHour;
use App\Models\VenueBooking;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class NoShowAutoReleaseService
{
    /**
     * Run auto-cancellation check for both venue bookings and equipment borrowings.
     *
     * 1. Pending reservations: auto-cancelled if scheduled start time + auto_cancel_mins has elapsed.
     * 2. Approved reservations: auto-cancelled if scheduled start time + arrival_grace_mins has elapsed (no-show).
     *
     * @param int|null $autoCancelMinutes Minutes after scheduled start time before pending reservation is auto-cancelled.
     * @param int|null $arrivalGraceMinutes Minutes after scheduled start time before approved reservation is cancelled for no-show.
     */
    public function processNoShows(?int $autoCancelMinutes = null, ?int $arrivalGraceMinutes = null): array
    {
        $opHours = OperatingHour::getSettings();

        $cancelMinutes = $autoCancelMinutes !== null
            ? $autoCancelMinutes
            : (int)($opHours->auto_cancel_mins ?? 30);

        $graceMinutes = $arrivalGraceMinutes !== null
            ? $arrivalGraceMinutes
            : (int)($opHours->arrival_grace_mins ?? 15);

        $released = [
            'venue_bookings'    => [],
            'equipment_borrows' => [],
        ];
        $now = now();

        // 1. Process Venue Bookings
        if (Schema::hasTable('venue_bookings') && Schema::hasTable('tracking_numbers')) {
            try {
                $unclaimedVenueBookings = DB::table('venue_bookings')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('venue_bookings.archived_at')
                    ->where(function ($q) {
                        $q->whereIn(DB::raw("LOWER(TRIM(COALESCE(venue_bookings.status, tracking_numbers.status, '')))"), ['pending', 'incomplete', 'approved'])
                          ->orWhere(function ($fallback) {
                              $fallback->whereNull('venue_bookings.status')
                                       ->whereIn(DB::raw("LOWER(TRIM(tracking_numbers.status))"), ['pending', 'incomplete', 'approved']);
                          });
                    })
                    ->where(function ($q) {
                        $completedStatuses = ['cancelled', 'rejected', 'completed', 'done', 'returned', 'released', 'ongoing', 'on_going', 'on-going', 'post-inspection'];
                        $q->whereNotIn(DB::raw("LOWER(TRIM(COALESCE(venue_bookings.status, '')))"), $completedStatuses)
                          ->whereNotIn(DB::raw("LOWER(TRIM(COALESCE(tracking_numbers.status, '')))"), $completedStatuses);
                    })
                    ->select(
                        'venue_bookings.id',
                        'venue_bookings.tracking_number_id',
                        'venue_bookings.date_of_usage',
                        'venue_bookings.reservation_end_date',
                        'venue_bookings.time_start',
                        'venue_bookings.time_end',
                        'venue_bookings.filer_name',
                        'venue_bookings.email_address',
                        'venue_bookings.equipment_notes',
                        'venue_bookings.assigned_units',
                        'venue_bookings.status as vb_status',
                        'tracking_numbers.status as tn_status',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                foreach ($unclaimedVenueBookings as $vb) {
                    if (empty($vb->date_of_usage) || empty($vb->time_start)) {
                        continue;
                    }

                    $vbStatus = strtolower(trim((string)$vb->vb_status));
                    $tnStatus = strtolower(trim((string)$vb->tn_status));
                    $isPending = in_array($vbStatus, ['pending', 'incomplete'], true)
                              || in_array($tnStatus, ['pending', 'incomplete'], true);

                    $startDateStr = trim(substr((string)$vb->date_of_usage, 0, 10));
                    $startTimeStr = trim((string)$vb->time_start);

                    try {
                        $startDt = Carbon::parse("{$startDateStr} {$startTimeStr}");
                    } catch (\Throwable $e) {
                        continue;
                    }

                    if ($isPending) {
                        // Pending venue bookings: Auto-cancel if unapproved past scheduled start time + auto_cancel_mins window
                        $cutoffTime = $startDt->copy()->addMinutes($cancelMinutes);
                        if ($now->lessThan($cutoffTime)) {
                            continue;
                        }

                        $reason = $cancelMinutes > 0
                            ? "Automatic cancellation: Venue reservation request was not approved before the scheduled start time plus {$cancelMinutes}-minute cancellation window."
                            : "Automatic cancellation: Venue reservation request was not approved before the scheduled start time.";
                    } else {
                        // Approved venue bookings: Auto-cancel if applicant no-shows past arrival_grace_mins from scheduled start time
                        $cutoffTime = $startDt->copy()->addMinutes($graceMinutes);
                        if ($now->lessThan($cutoffTime)) {
                            continue;
                        }

                        $reason = "Automatic cancellation: No-show past grace period ({$graceMinutes} mins).";
                    }

                        // Update tracking status to cancelled
                        if ($vb->tracking_number_id) {
                            DB::table('tracking_numbers')
                                ->where('id', $vb->tracking_number_id)
                                ->update(['status' => 'cancelled', 'updated_at' => $now]);
                        }

                        $vbUpdate = ['status' => 'cancelled', 'updated_at' => $now];
                        if (Schema::hasColumn('venue_bookings', 'rejection_reason')) {
                            $vbUpdate['rejection_reason'] = $reason;
                        }
                        DB::table('venue_bookings')
                            ->where('id', $vb->id)
                            ->update($vbUpdate);

                        // Release any assigned physical units back to available
                        $assigned = !empty($vb->assigned_units)
                            ? (is_array($vb->assigned_units) ? $vb->assigned_units : json_decode($vb->assigned_units, true))
                            : [];
                        if (is_array($assigned) && !empty($assigned) && Schema::hasTable('equipment_units')) {
                            $codes = array_values(array_filter($assigned));
                            EquipmentUnit::where(function ($q) use ($codes) {
                                $q->whereIn('barcode', $codes)
                                  ->orWhereIn('id', array_filter($codes, 'is_numeric'));
                            })
                            ->whereNotIn('status', ['damaged', 'lost', 'decommissioned', 'maintenance'])
                            ->update(['status' => 'available']);
                        }

                        $refCode = $vb->reference_code ?: "TRK-AVR{$vb->id}";

                        // Broadcast status update
                        event(new BookingStatusUpdated('venue_booking', $refCode, 'cancelled', $vb->id, $reason));

                        // Broadcast inventory update so reserved gear is instantly available to others
                        event(new InventoryStockUpdated(null, 'no_show_released', ['reference_code' => $refCode]));

                        // Dispatch email notification to filer
                        try {
                            $bookingModel = VenueBooking::find($vb->id);
                            if ($bookingModel) {
                                SendBookingStatusUpdateJob::dispatch('venue', $bookingModel, 'cancelled', $reason);
                            }
                        } catch (\Throwable $e) {
                            Log::warning("NoShowAutoRelease: Could not dispatch mail for VenueBooking #{$vb->id}: " . $e->getMessage());
                        }

                        // Persist in-app notification for Super Admin, Staff, and Student Assistant
                        if (Schema::hasTable('notifications')) {
                            try {
                                $filerName = $vb->filer_name ?: 'Applicant';
                                DB::table('notifications')->insert([
                                    'title'          => "Auto-Cancellation: {$refCode}",
                                    'message'        => "Venue reservation {$refCode} for {$filerName} auto-cancelled. Reason: {$reason}",
                                    'type'           => 'auto_cancelled',
                                    'target_type'    => 'venue_booking',
                                    'target_id'      => $vb->id,
                                    'reference_code' => $refCode,
                                    'created_at'     => $now,
                                    'updated_at'     => $now,
                                ]);
                            } catch (\Throwable $e) {}
                        }

                        $released['venue_bookings'][] = $refCode;
                        Log::info("NoShowAutoRelease: Venue booking {$refCode} auto-cancelled ({$reason}).");
                }
            } catch (\Throwable $e) {
                Log::error("NoShowAutoRelease: Error processing venue bookings: " . $e->getMessage());
            }
        }

        // 2. Process Equipment Borrowings
        if (Schema::hasTable('equipment_borrows') && Schema::hasTable('tracking_numbers')) {
            try {
                $unclaimedBorrows = DB::table('equipment_borrows')
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->whereNull('equipment_borrows.archived_at')
                    ->where(function ($q) {
                        $q->whereIn(DB::raw("LOWER(TRIM(COALESCE(equipment_borrows.status, tracking_numbers.status, '')))"), ['pending', 'incomplete', 'approved'])
                          ->orWhere(function ($fallback) {
                              $fallback->whereNull('equipment_borrows.status')
                                       ->whereIn(DB::raw("LOWER(TRIM(tracking_numbers.status))"), ['pending', 'incomplete', 'approved']);
                          });
                    })
                    ->where(function ($q) {
                        $completedStatuses = ['cancelled', 'rejected', 'completed', 'done', 'returned', 'released', 'ongoing', 'on_going', 'on-going', 'post-inspection'];
                        $q->whereNotIn(DB::raw("LOWER(TRIM(COALESCE(equipment_borrows.status, '')))"), $completedStatuses)
                          ->whereNotIn(DB::raw("LOWER(TRIM(COALESCE(tracking_numbers.status, '')))"), $completedStatuses);
                    })
                    ->select(
                        'equipment_borrows.id',
                        'equipment_borrows.tracking_number_id',
                        'equipment_borrows.date_of_usage',
                        'equipment_borrows.extend_of_date_returned',
                        'equipment_borrows.time_start',
                        'equipment_borrows.time_end',
                        'equipment_borrows.first_name',
                        'equipment_borrows.last_name',
                        'equipment_borrows.filer_name',
                        'equipment_borrows.email_address',
                        'equipment_borrows.assigned_units',
                        'equipment_borrows.status as eb_status',
                        'tracking_numbers.status as tn_status',
                        'tracking_numbers.reference_code'
                    )
                    ->get();

                foreach ($unclaimedBorrows as $eb) {
                    if (empty($eb->date_of_usage) || empty($eb->time_start)) {
                        continue;
                    }

                    $ebStatus = strtolower(trim((string)$eb->eb_status));
                    $tnStatus = strtolower(trim((string)$eb->tn_status));
                    $isPending = in_array($ebStatus, ['pending', 'incomplete'], true)
                              || in_array($tnStatus, ['pending', 'incomplete'], true);

                    $startDateStr = trim(substr((string)$eb->date_of_usage, 0, 10));
                    $startTimeStr = trim((string)$eb->time_start);

                    try {
                        $startDt = Carbon::parse("{$startDateStr} {$startTimeStr}");
                    } catch (\Throwable $e) {
                        continue;
                    }

                    if ($isPending) {
                        // Pending equipment borrows: Auto-cancel if unapproved past scheduled start time + auto_cancel_mins window
                        $cutoffTime = $startDt->copy()->addMinutes($cancelMinutes);
                        if ($now->lessThan($cutoffTime)) {
                            continue;
                        }

                        $reason = $cancelMinutes > 0
                            ? "Automatic cancellation: Equipment borrowing request was not approved before the scheduled start time plus {$cancelMinutes}-minute cancellation window."
                            : "Automatic cancellation: Equipment borrowing request was not approved before the scheduled start time.";
                    } else {
                        // Approved equipment borrows: Auto-cancel if borrower no-shows past arrival_grace_mins from scheduled start time
                        $cutoffTime = $startDt->copy()->addMinutes($graceMinutes);
                        if ($now->lessThan($cutoffTime)) {
                            continue;
                        }

                        $reason = "Automatic cancellation: No-show past grace period ({$graceMinutes} mins).";
                    }

                        if ($eb->tracking_number_id) {
                            DB::table('tracking_numbers')
                                ->where('id', $eb->tracking_number_id)
                                ->update(['status' => 'cancelled', 'updated_at' => $now]);
                        }

                        $ebUpdate = ['status' => 'cancelled', 'updated_at' => $now];
                        if (Schema::hasColumn('equipment_borrows', 'rejection_reason')) {
                            $ebUpdate['rejection_reason'] = $reason;
                        }
                        DB::table('equipment_borrows')
                            ->where('id', $eb->id)
                            ->update($ebUpdate);

                        // Release any assigned physical units back to available
                        $assigned = !empty($eb->assigned_units)
                            ? (is_array($eb->assigned_units) ? $eb->assigned_units : json_decode($eb->assigned_units, true))
                            : [];
                        if (is_array($assigned) && !empty($assigned) && Schema::hasTable('equipment_units')) {
                            $codes = array_values(array_filter($assigned));
                            EquipmentUnit::where(function ($q) use ($codes) {
                                $q->whereIn('barcode', $codes)
                                  ->orWhereIn('id', array_filter($codes, 'is_numeric'));
                            })
                            ->whereNotIn('status', ['damaged', 'lost', 'decommissioned', 'maintenance'])
                            ->update(['status' => 'available']);
                        }

                        $refCode = $eb->reference_code ?: "EQ-2026-{$eb->id}";

                        event(new BookingStatusUpdated('equipment_borrowing', $refCode, 'cancelled', $eb->id, $reason));
                        event(new InventoryStockUpdated(null, 'no_show_released', ['reference_code' => $refCode]));

                        try {
                            $borrowModel = EquipmentBorrow::find($eb->id);
                            if ($borrowModel) {
                                SendBookingStatusUpdateJob::dispatch('equipment', $borrowModel, 'cancelled', $reason);
                            }
                        } catch (\Throwable $e) {
                            Log::warning("NoShowAutoRelease: Could not dispatch mail for EquipmentBorrow #{$eb->id}: " . $e->getMessage());
                        }

                        // Persist in-app notification for Super Admin, Staff, and Student Assistant
                        if (Schema::hasTable('notifications')) {
                            try {
                                $filerName = $eb->filer_name ?: trim("{$eb->first_name} {$eb->last_name}") ?: 'Borrower';
                                DB::table('notifications')->insert([
                                    'title'          => "Auto-Cancellation: {$refCode}",
                                    'message'        => "Equipment borrowing {$refCode} for {$filerName} auto-cancelled. Reason: {$reason}",
                                    'type'           => 'auto_cancelled',
                                    'target_type'    => 'equipment_borrow',
                                    'target_id'      => $eb->id,
                                    'reference_code' => $refCode,
                                    'created_at'     => $now,
                                    'updated_at'     => $now,
                                ]);
                            } catch (\Throwable $e) {}
                        }

                        $released['equipment_borrows'][] = $refCode;
                        Log::info("NoShowAutoRelease: Equipment borrow {$refCode} auto-cancelled ({$reason}).");
                }
            } catch (\Throwable $e) {
                Log::error("NoShowAutoRelease: Error processing equipment borrows: " . $e->getMessage());
            }
        }

        return $released;
    }
}
