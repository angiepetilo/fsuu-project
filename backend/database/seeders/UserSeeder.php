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

        // Single Admin User — email is the login username, personal_email is for notifications
        User::updateOrCreate(
            ['email' => 'admin'],
            [
                'name'           => 'Admin',
                'personal_email' => null,
                'password'       => Hash::make('admin123'),
                'office_id'      => $scoOffice->id,
                'role'           => 'admin',
            ]
        );
    }
}
