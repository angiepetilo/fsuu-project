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
        $this->info('Scanning for overdue equipment borrowings...');

        $now = Carbon::now();

        $ongoingBorrowings = EquipmentBorrowing::with('trackingNumber')
            ->where(function ($q) {
                $q->whereHas('trackingNumber', function ($t) {
                    $t->whereIn('status', ['ongoing', 'on-going', 'approved']);
                })
                ->orWhereIn('status', ['ongoing', 'on-going']);
            })
            ->get();

        $overdueCount = 0;

        foreach ($ongoingBorrowings as $borrowing) {
            $dateOfUsage = $borrowing->date_of_usage ? substr((string)$borrowing->date_of_usage, 0, 10) : null;
            $timeEnd = $borrowing->time_end ?? '17:00:00';
            $endDatetimeStr = $borrowing->end_datetime ?? ($dateOfUsage ? "{$dateOfUsage} {$timeEnd}" : null);

            if (!$endDatetimeStr) {
                continue;
            }

            $schedEnd = Carbon::parse($endDatetimeStr);

            if ($now->greaterThan($schedEnd)) {
                $minutesLate = $now->diffInMinutes($schedEnd);
                $this->warn("Borrowing #{$borrowing->id} ({$borrowing->reference_code}) is {$minutesLate} mins overdue.");

                try {
                    SmsService::sendOverdueAlert($borrowing, (int)$minutesLate);
                    $overdueCount++;
                } catch (\Throwable $e) {
                    Log::error("Failed to send overdue SMS for Borrowing #{$borrowing->id}: " . $e->getMessage());
                }
            }
        }

        $this->info("Completed scan. Sent {$overdueCount} overdue SMS reminders.");
        return Command::SUCCESS;
    }
}
