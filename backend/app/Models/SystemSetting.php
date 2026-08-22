<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Config;

class SystemSetting extends Model
{
    use HasFactory;

    protected $table = 'system_settings';

    protected $fillable = [
        'system_name',
        'organization_name',
        'contact_email',
        'contact_phone',
        'timezone',
        'auto_shift_tomorrow_after_hours',
        'allow_advance_equipment_booking',
        'max_items_per_borrow',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'mail_from_address',
        'mail_from_name',
    ];

    protected $casts = [
        'auto_shift_tomorrow_after_hours' => 'boolean',
        'allow_advance_equipment_booking' => 'boolean',
        'max_items_per_borrow'            => 'integer',
        'smtp_port'                       => 'integer',
    ];

    /**
     * Get the singleton SystemSetting instance or create with defaults.
     */
    public static function getSettings(): self
    {
        $settings = self::first();
        if (!$settings) {
            $settings = self::create([
                'system_name'                    => 'FSUU Facilities & Equipment Booking System',
                'organization_name'              => 'Father Saturnino Urios University',
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
            ]);
        }
        return $settings;
    }

    /**
     * Dynamically configure Laravel's mailer with database-backed SMTP settings.
     */
    public static function configureMailer(): void
    {
        try {
            $settings = self::first();
            if ($settings && !empty($settings->smtp_host)) {
                Config::set('mail.default', 'smtp');
                Config::set('mail.mailers.smtp.host', $settings->smtp_host);
                Config::set('mail.mailers.smtp.port', $settings->smtp_port ?: 587);
                if (!empty($settings->smtp_username)) {
                    Config::set('mail.mailers.smtp.username', $settings->smtp_username);
                }
                if (!empty($settings->smtp_password)) {
                    Config::set('mail.mailers.smtp.password', $settings->smtp_password);
                }
                Config::set('mail.mailers.smtp.encryption', $settings->smtp_encryption ?: 'tls');

                if (!empty($settings->mail_from_address)) {
                    Config::set('mail.from.address', $settings->mail_from_address);
                }
                if (!empty($settings->mail_from_name)) {
                    Config::set('mail.from.name', $settings->mail_from_name);
                }
            }
        } catch (\Throwable $e) {}
    }
}
