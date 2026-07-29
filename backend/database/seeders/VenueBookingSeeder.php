<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VenueBookingSeeder extends Seeder
{
    public function run(): void
    {
        $mainOffice = Office::where('slug', 'fsuu-main')->first();
        $morelosOffice = Office::where('slug', 'fsuu-morelos')->first();

        $avr1 = Venue::where('name', 'AVR 1')->first() ?? Venue::first();
        $webcast = Venue::where('name', 'Webcast Studio')->first() ?? Venue::latest()->first();

        if (!$avr1 || !$webcast) {
            $this->command->warn('Venues not found. Run VenueSeeder first.');
            return;
        }

        $seedBookings = [
            [
                'ref'            => 'TRK-AVR8921',
                'venue_id'       => $avr1->id,
                'filer_name'     => 'Maria Santos',
                'email_address'  => 'm.santos@fsuu.edu.ph',
                'program_office' => 'College of Engineering & Technology',
                'contact_number' => '09171234567',
                'classification' => 'student',
                'purpose'        => 'Annual Engineering Research Symposium & Technology Expo',
                'no_of_person'   => 150,
                'date_of_usage'  => now()->addDays(5)->toDateString(),
                'time_start'     => '08:00:00',
                'time_end'       => '12:00:00',
                'status'         => 'pending',
            ],
            [
                'ref'            => 'TRK-SCO4029',
                'venue_id'       => $webcast->id,
                'filer_name'     => 'Prof. Alex Mercer',
                'email_address'  => 'a.mercer@fsuu.edu.ph',
                'program_office' => 'Mass Communication Department',
                'contact_number' => '09189876543',
                'classification' => 'faculty',
                'purpose'        => 'University Broadcast Documentary & Media Workshop',
                'no_of_person'   => 40,
                'date_of_usage'  => now()->addDays(7)->toDateString(),
                'time_start'     => '13:00:00',
                'time_end'       => '17:00:00',
                'status'         => 'pending',
            ],
        ];

        DB::table('venue_bookings')->truncate();
        DB::table('tracking_numbers')->where('reservation_type', 'venue_booking')->delete();

        foreach ($seedBookings as $b) {
            // Create Tracking Number
            $trackingId = DB::table('tracking_numbers')->insertGetId([
                'reference_code'   => $b['ref'],
                'reservation_type' => 'venue_booking',
                'reservation_id'   => 0, // Placeholder
                'status'           => $b['status'],
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            // Create Venue Booking
            $bookingId = DB::table('venue_bookings')->insertGetId([
                'tracking_number_id' => $trackingId,
                'venue_id'           => $b['venue_id'],
                'submission_channel' => 'online_self',
                'filer_name'         => $b['filer_name'],
                'email_address'      => $b['email_address'],
                'program_office'     => $b['program_office'],
                'contact_number'     => $b['contact_number'],
                'province'           => 'Agusan del Norte',
                'city'               => 'Butuan City',
                'barangay'           => 'San Vicente',
                'street'             => 'JC Aquino Avenue',
                'classification'     => $b['classification'],
                'place_of_use'       => 'inside',
                'purpose'            => $b['purpose'],
                'no_of_person'       => $b['no_of_person'],
                'date_of_usage'      => $b['date_of_usage'],
                'time_start'         => $b['time_start'],
                'time_end'           => $b['time_end'],
                'school_id'          => '2024-001928',
                'agreed_to_policy'   => true,
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);

            // Update Tracking Number reservation_id
            DB::table('tracking_numbers')->where('id', $trackingId)->update(['reservation_id' => $bookingId]);
        }

        $this->command->info('Venue bookings seeded with pending status!');
    }
}
