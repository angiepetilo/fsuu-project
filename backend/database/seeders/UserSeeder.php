<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Only updates/creates users and offices. Safe to re-run without wiping data.
     */
    public function run(): void
    {
        // Create AVR Office
        $avrOffice = Office::firstOrCreate(
            ['code' => 'AVR'],
            [
                'name'     => 'Audio Visual Room (AVR)',
                'type'     => 'avr',
                'pin_hash' => Hash::make('123456'),
            ]
        );

        // Create SCO Office with oversight link to AVR
        $scoOffice = Office::firstOrCreate(
            ['code' => 'SCO'],
            [
                'name'               => 'Strategic Communication Office (SCO)',
                'type'               => 'sco',
                'can_view_office_id' => $avrOffice->id,
                'pin_hash'           => Hash::make('123456'),
            ]
        );

        // ── System Administrator ───────────────────────────────────────────────
        // Has NO office_id — the portal auto-routes to /sysad/dashboard on login.
        // Manages all offices, user accounts, settings, and reports.
        User::updateOrCreate(
            ['email' => 'admin'],
            [
                'name'           => 'System Administrator',
                'personal_email' => null,
                'password'       => Hash::make('admin123'),
                'office_id'      => null,   // null = system-level, not tied to any office
                'role'           => 'admin',
            ]
        );
    }
}
