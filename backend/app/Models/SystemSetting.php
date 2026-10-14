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
        'sms_api_key',
        'sms_api_url',
        'abstract_email_api_key',
        'facebook_url',
        'facebook_name',
    ];

    protected $appends = [
        'university_name',
        'telephone_no',
    ];

    protected $casts = [
        'auto_shift_tomorrow_after_hours' => 'boolean',
        'allow_advance_equipment_booking' => 'boolean',
        'max_items_per_borrow'            => 'integer',
        'smtp_port'                       => 'integer',
    ];

    public function getUniversityNameAttribute()
    {
        return $this->organization_name ?: 'Father Saturnino Urios University';
    }

    public function getTelephoneNoAttribute()
    {
        return $this->contact_phone ?: '(085) 342-1830';
    }

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
            // Gracefully reset json_last_error that Crypt's internal json_decode may have set
            json_decode('[]');
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
            json_decode('[]');
            $this->attributes['smtp_password'] = $value;
        }
    }

    /**
     * Safely update key-value pairs in the backend .env file.
     */
    public static function updateEnvFile(array $values): void
    {
        try {
            $envPath = base_path('.env');
            if (!file_exists($envPath) || !is_writable($envPath)) {
                return;
            }

            $envContent = file_get_contents($envPath);
            foreach ($values as $key => $val) {
                $key = trim($key);
                $val = trim((string)$val);
                if (str_contains($val, ' ') || str_contains($val, '#') || str_contains($val, '$')) {
                    $val = '"' . addcslashes($val, '"\\') . '"';
                }
                if (preg_match("/^{$key}=.*/m", $envContent)) {
                    $envContent = preg_replace("/^{$key}=.*/m", "{$key}={$val}", $envContent);
                } else {
                    $envContent .= "\n{$key}={$val}";
                }
            }
            file_put_contents($envPath, $envContent);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Could not write to .env: " . $e->getMessage());
        }
    }

    /**
     * Get the singleton SystemSetting instance or create with defaults.
     */
    public static function getSettings(): self
    {
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
                    'facebook_url'                   => 'https://www.facebook.com/fsuubutuan',
                    'abstract_email_api_key'         => env('ABSTRACT_EMAIL_API_KEY', ''),
                ]);
            }
            if (empty($settings->abstract_email_api_key) && env('ABSTRACT_EMAIL_API_KEY')) {
                $settings->abstract_email_api_key = env('ABSTRACT_EMAIL_API_KEY');
            }
            return $settings;
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
                'facebook_url'                   => 'https://www.facebook.com/fsuubutuan',
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
                $settings = self::first();
                if ($settings) {
                    if (!empty($settings->mail_from_address)) {
                        Config::set('mail.from.address', $settings->mail_from_address);
                    }
                    if (!empty($settings->mail_from_name)) {
                        Config::set('mail.from.name', $settings->mail_from_name);
                    }
                }
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
                if (!empty($settings->smtp_host) && !empty($settings->smtp_username)) {
                    Config::set('mail.default', 'smtp');
                    Config::set('mail.mailers.smtp.host', $settings->smtp_host);
                    Config::set('mail.mailers.smtp.port', (int) ($settings->smtp_port ?: 587));
                    Config::set('mail.mailers.smtp.username', $settings->smtp_username);
                    Config::set('mail.mailers.smtp.password', $settings->smtp_password);
                    Config::set('mail.mailers.smtp.encryption', $settings->smtp_encryption ?: 'tls');
                }

                if (!empty($settings->mail_from_address)) {
                    Config::set('mail.from.address', $settings->mail_from_address);
                }
                if (!empty($settings->mail_from_name)) {
                    Config::set('mail.from.name', $settings->mail_from_name);
                }

                Mail::purge('smtp');
            }
        } catch (\Throwable $e) {}
    }
}
