<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('bookings:auto-release-no-shows {--grace=15}', function () {
    $grace = (int)($this->option('grace') ?: 15);
    $this->info("Running No-Show Auto-Release check with {$grace}m grace period...");
    $result = app(\App\Services\NoShowAutoReleaseService::class)->processNoShows($grace);
    $this->info("Cancelled " . count($result['venue_bookings']) . " venue bookings and " . count($result['equipment_borrows']) . " equipment borrows.");
})->purpose('Auto-release unclaimed reservations past grace period and restock equipment');

Artisan::command('bookings:check-overdue-and-exceeded', function () {
    $this->info("Checking active reservations exceeding scheduled end time or passed due...");
    $result = app(\App\Services\OverdueAndExceededAlertService::class)->processAlerts();
    $this->info("Alerted " . count($result['venue_exceeded']) . " exceeded venue bookings, " . count($result['equipment_exceeded']) . " exceeded equipment borrows, and " . count($result['equipment_overdue']) . " overdue equipment borrows.");
})->purpose('Check and alert reservations past scheduled end time or passed due');

\Illuminate\Support\Facades\Schedule::command('bookings:check-overdue-and-exceeded')->everyFifteenMinutes();
\Illuminate\Support\Facades\Schedule::command('email:update-disposable-domains')->weekly();


