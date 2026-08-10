<?php
require __DIR__ . '/../../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../../backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\AvrVenueBookingService;
use App\Models\Venue;

try {
    $venue = Venue::first();
    if (!$venue) {
        echo "No venue found.\n";
        exit;
    }
    $service = app(AvrVenueBookingService::class);
    $res = $service->create([
        'venue_id' => $venue->id,
        'filer_name' => 'Test User',
        'email_address' => 'test@urios.edu.ph',
        'program_office' => 'CSP',
        'contact_number' => '09123456789',
        'classification' => 'student',
        'purpose' => 'Test Event',
        'no_of_person' => 10,
        'date_of_usage' => '2026-08-11',
        'time_start' => '08:00:00',
        'time_end' => '10:00:00',
    ]);
    echo "SUCCESS! Created booking ID: " . $res['id'] . " Reference Code: " . $res['reference_code'] . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\nTrace:\n" . $e->getTraceAsString() . "\n";
}
