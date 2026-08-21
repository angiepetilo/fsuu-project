<?php

namespace App\Console\Commands;

use App\Models\EquipmentBorrowing;
use App\Services\SmsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckOverdueEquipmentCommand extends Command
{
    protected $signature = 'equipment:check-overdue';
    protected $description = 'Scan on-going equipment borrowings and send SMS alerts for past due / overdue physical units';

    public function handle(): int
    {
        $this->info('Scanning equipment borrowings for upcoming due times and overdue units...');

        $now = Carbon::now();

        $ongoingBorrowings = EquipmentBorrowing::with('trackingNumber')
            ->where(function ($q) {
                $q->whereHas('trackingNumber', function ($t) {
                    $t->whereIn('status', ['ongoing', 'on-going']);
                })
                ->orWhereIn('status', ['ongoing', 'on-going']);
            })
            ->get();

        $overdueCount = 0;
        $advanceCount = 0;

        foreach ($ongoingBorrowings as $borrowing) {
            $dateOfUsage = $borrowing->date_of_usage ? substr((string)$borrowing->date_of_usage, 0, 10) : null;
            $timeEnd = $borrowing->time_end ?? '17:00:00';
            $endDatetimeStr = $borrowing->end_datetime ?? ($dateOfUsage ? "{$dateOfUsage} {$timeEnd}" : null);

            if (!$endDatetimeStr) {
                continue;
            }

            try {
                $schedEnd = Carbon::parse($endDatetimeStr);
            } catch (\Throwable $t) {
                continue;
            }

            // Case A: Equipment is Overdue (past end time)
            if ($now->greaterThan($schedEnd)) {
                $minutesLate = (int) $now->diffInMinutes($schedEnd);
                $cacheKey = "overdue_sms_sent_{$borrowing->id}_" . floor($minutesLate / 30); // Throttle to every 30 mins

                if (!\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                    $this->warn("Borrowing #{$borrowing->id} ({$borrowing->reference_code}) is {$minutesLate} mins overdue.");
                    try {
                        SmsService::sendOverdueAlert($borrowing, $minutesLate);
                        \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addMinutes(35));
                        $overdueCount++;
                    } catch (\Throwable $e) {
                        Log::error("Failed to send overdue SMS for Borrowing #{$borrowing->id}: " . $e->getMessage());
                    }
                }
            } 
            // Case B: Equipment is Approaching End Time (15 minutes before return time)
            elseif ($schedEnd->diffInMinutes($now) <= 15 && $now->lessThan($schedEnd)) {
                $advanceKey = "advance_due_sms_sent_{$borrowing->id}";
                if (!\Illuminate\Support\Facades\Cache::has($advanceKey)) {
                    $minutesRemaining = max(1, (int) $schedEnd->diffInMinutes($now));
                    $this->info("Borrowing #{$borrowing->id} ({$borrowing->reference_code}) is due in {$minutesRemaining} mins.");
                    try {
                        SmsService::sendUpcomingDueReminder($borrowing, $minutesRemaining);
                        \Illuminate\Support\Facades\Cache::put($advanceKey, true, now()->addHours(2));
                        $advanceCount++;
                    } catch (\Throwable $e) {
                        Log::error("Failed to send advance due SMS for Borrowing #{$borrowing->id}: " . $e->getMessage());
                    }
                }
            }
        }

        $this->info("Scan completed: {$advanceCount} advance reminder(s) and {$overdueCount} overdue alert(s) sent.");
        return Command::SUCCESS;
    }
}
