<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class SystemSetting extends Model
{
    use HasFactory;

    protected $table = 'system_settings';

    protected $fillable = [
        'system_name',
        'organization_name',
        'header_brand_text',
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
     * Resilient accessor for smtp_password that safely decrypts or returns raw string.
     */
    public function getSmtpPasswordAttribute($value)
    {
        if (empty($value)) {
            return '';
        }
        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($value);
        } catch (\Throwable $e) {
            // Gracefully return raw value if unencrypted or encrypted under different key
            return $value;
        }
    }

    /**
     * Resilient mutator for smtp_password.
     */
    public function setSmtpPasswordAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['smtp_password'] = null;
            return;
        }
        try {
            $this->attributes['smtp_password'] = \Illuminate\Support\Facades\Crypt::encryptString($value);
        } catch (\Throwable $e) {
            $this->attributes['smtp_password'] = $value;
        }
    }

    /**
     * Get the singleton SystemSetting instance or create with defaults.
     */
    public static function getSettings(): self
    {
        try {
            return \Illuminate\Support\Facades\Cache::remember('system_settings_singleton', 86400, function () {
                $settings = null;
                try {
                    $settings = self::first();
                    if (!$settings) {
                        $settings = self::create([
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
                        ]);
                    }
                } catch (\Throwable $e) {
                    $settings = new self([
                        'system_name'                    => 'FSUU Facilities & Equipment Booking System',
                        'organization_name'              => 'Father Saturnino Urios University',
                        'header_brand_text'              => 'Urios',
                        'contact_email'                  => 'support.booking@fsuu.edu.ph',
                        'contact_phone'                  => '(085) 342-1830',
                        'timezone'                       => 'Asia/Manila (UTC+8)',
                        'auto_shift_tomorrow_after_hours'=> true,
                        'allow_advance_equipment_booking'=> true,
                        'max_items_per_borrow'           => 5,
                    ]);
                }
                return $settings;
            });
        } catch (\Throwable $e) {
            return new self([
                'system_name'                    => 'FSUU Facilities & Equipment Booking System',
                'organization_name'              => 'Father Saturnino Urios University',
                'header_brand_text'              => 'Urios',
                'contact_email'                  => 'support.booking@fsuu.edu.ph',
                'contact_phone'                  => '(085) 342-1830',
                'timezone'                       => 'Asia/Manila (UTC+8)',
                'auto_shift_tomorrow_after_hours'=> true,
                'allow_advance_equipment_booking'=> true,
                'max_items_per_borrow'           => 5,
            ]);
        }
    }

    /**
     * Dynamically configure Laravel's mailer with database-backed SMTP settings.
     */
    public static function configureMailer(): void
    {
        try {
            $configuredMailer = env('MAIL_MAILER', config('mail.default', 'smtp'));

            // If explicitly configured for local development log or array, respect it without attempting socket connections
            if (in_array($configuredMailer, ['log', 'array'])) {
                Config::set('mail.default', $configuredMailer);
                return;
            }

            // If the app is configured with an API transport (brevo, resend), respect it
            if (in_array($configuredMailer, ['brevo', 'resend'])) {
                Config::set('mail.default', $configuredMailer);
                return;
            }

            $settings = self::first();
            $envHost = env('MAIL_HOST');
            $envUser = env('MAIL_USERNAME');
            $envPass = env('MAIL_PASSWORD');
            $envPort = env('MAIL_PORT', 587);
            $envEnc  = env('MAIL_ENCRYPTION', 'tls');
            $envFrom = env('MAIL_FROM_ADDRESS');
            $envFromName = env('MAIL_FROM_NAME');

            if ($settings) {
                // If DB setting is the legacy fallback 'smtp.gmail.com' and .env specifies a configured SMTP host, sync DB
                if ($envHost && ($settings->smtp_host === 'smtp.gmail.com' || empty($settings->smtp_host) || empty($settings->smtp_username))) {
                    $settings->update([
                        'smtp_host'         => $envHost,
                        'smtp_port'         => (int) $envPort,
                        'smtp_username'     => $envUser,
                        'smtp_password'     => $envPass,
                        'smtp_encryption'   => $envEnc,
                        'mail_from_address' => $envFrom ?: $settings->mail_from_address,
                        'mail_from_name'    => $envFromName ?: $settings->mail_from_name,
                    ]);
                    $settings->refresh();
                }

                if (!empty($settings->smtp_host) && !empty($settings->smtp_username)) {
                    Config::set('mail.default', 'smtp');
                    Config::set('mail.mailers.smtp.host', $settings->smtp_host);
                    Config::set('mail.mailers.smtp.port', (int) ($settings->smtp_port ?: 587));
                    Config::set('mail.mailers.smtp.username', $settings->smtp_username ?: $envUser);
                    Config::set('mail.mailers.smtp.password', $settings->smtp_password ?: $envPass);
                    Config::set('mail.mailers.smtp.encryption', $settings->smtp_encryption ?: $envEnc);
                }

                if (!empty($settings->mail_from_address) || !empty($envFrom)) {
                    Config::set('mail.from.address', $settings->mail_from_address ?: $envFrom);
                }
                if (!empty($settings->mail_from_name) || !empty($envFromName)) {
                    Config::set('mail.from.name', $settings->mail_from_name ?: $envFromName);
                }

                Mail::purge('smtp');
            }
        } catch (\Throwable $e) {}
    }
}
