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
        // Role: admin (User Management only — creates and manages staff accounts)
        User::updateOrCreate(
            ['email' => 'admin'],
            [
                'name'           => 'System Administrator',
                'personal_email' => 'admin@fsuu.edu.ph',
                'password'       => Hash::make('admin123'),
                'office_id'      => null,   // null = system-level, no office
                'role'           => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'admin@fsuu.edu.ph'],
            [
                'name'           => 'System Administrator',
                'personal_email' => 'admin@fsuu.edu.ph',
                'password'       => Hash::make('admin123'),
                'office_id'      => null,
                'role'           => 'admin',
            ]
        );

        // ── AVR Office Administrator ──────────────────────────────────────────
        // Role: staff (Manages AVR venue bookings, equipment borrowing & inventory)
        User::updateOrCreate(
            ['email' => 'avradmin'],
            [
                'name'           => 'AVR Manager',
                'personal_email' => 'avr@fsuu.edu.ph',
                'password'       => Hash::make('admin123'),
                'office_id'      => $avrOffice->id,
                'role'           => 'staff',
            ]
        );

        User::updateOrCreate(
            ['email' => 'avr@fsuu.edu.ph'],
            [
                'name'           => 'AVR Manager',
                'personal_email' => 'avr@fsuu.edu.ph',
                'password'       => Hash::make('admin123'),
                'office_id'      => $avrOffice->id,
                'role'           => 'staff',
            ]
        );

        // ── SCO Office Administrator ──────────────────────────────────────────
        // Role: staff (Manages SCO studio reservations & equipment)
        User::updateOrCreate(
            ['email' => 'scoadmin'],
            [
                'name'           => 'SCO Manager',
                'personal_email' => 'sco@fsuu.edu.ph',
                'password'       => Hash::make('admin123'),
                'office_id'      => $scoOffice->id,
                'role'           => 'staff',
            ]
        );

        User::updateOrCreate(
            ['email' => 'sco@fsuu.edu.ph'],
            [
                'name'           => 'SCO Manager',
                'personal_email' => 'sco@fsuu.edu.ph',
                'password'       => Hash::make('admin123'),
                'office_id'      => $scoOffice->id,
                'role'           => 'staff',
            ]
        );
    }
}
