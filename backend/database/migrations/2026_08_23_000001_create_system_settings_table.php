<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();

            // General Information
            $table->string('system_name')->default('FSUU Facilities & Equipment Booking System');
            $table->string('organization_name')->default('Father Saturnino Urios University');
            $table->string('header_brand_text')->default('Urios');
            $table->string('contact_email')->default('support.booking@fsuu.edu.ph');
            $table->string('contact_phone')->default('(085) 342-1830');
            $table->string('timezone')->default('Asia/Manila (UTC+8)');

            // Equipment Reservation Policies
            $table->boolean('auto_shift_tomorrow_after_hours')->default(true);
            $table->boolean('allow_advance_equipment_booking')->default(true);
            $table->unsignedInteger('max_items_per_borrow')->default(5);

            // Dynamic SMTP Configuration
            $table->string('smtp_host')->nullable();
            $table->unsignedInteger('smtp_port')->nullable()->default(587);
            $table->string('smtp_username')->nullable();
            $table->text('smtp_password')->nullable();
            $table->string('smtp_encryption')->nullable()->default('tls'); // tls, ssl, or null
            $table->string('mail_from_address')->nullable();
            $table->string('mail_from_name')->nullable();

            $table->timestamps();
        });

        // Seed initial row
        DB::table('system_settings')->insert([
            'system_name'                    => 'FSUU Facilities & Equipment Booking System',
            'organization_name'              => 'Father Saturnino Urios University',
            'header_brand_text'              => 'Urios',
            'contact_email'                  => 'support.booking@fsuu.edu.ph',
            'contact_phone'                  => '(085) 342-1830',
            'timezone'                       => 'Asia/Manila (UTC+8)',
            'auto_shift_tomorrow_after_hours'=> true,
            'allow_advance_equipment_booking'=> true,
            'max_items_per_borrow'           => 5,
            'smtp_host'                      => env('MAIL_HOST', 'smtp.gmail.com'),
            'smtp_port'                      => (int) env('MAIL_PORT', 587),
            'smtp_username'                  => env('MAIL_USERNAME', ''),
            'smtp_password'                  => env('MAIL_PASSWORD', ''),
            'smtp_encryption'                => env('MAIL_ENCRYPTION', 'tls'),
            'mail_from_address'              => env('MAIL_FROM_ADDRESS', 'support.booking@fsuu.edu.ph'),
            'mail_from_name'                 => env('MAIL_FROM_NAME', 'FSUU Facilities & Equipment Booking'),
            'created_at'                     => now(),
            'updated_at'                     => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
