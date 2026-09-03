<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PhoneVerification extends Model
{
    use HasFactory;

    protected $table = 'phone_verifications';

    protected $fillable = [
        'phone_number',
        'otp_code',
        'expires_at',
        'verified_at',
        'ip_address',
    ];

    protected $casts = [
        'expires_at'  => 'datetime',
        'verified_at' => 'datetime',
    ];

    /**
     * Clean and normalize Philippine phone number format.
     */
    public static function normalizePhoneNumber(string $phone): string
    {
        $clean = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($clean, '63')) {
            $clean = '0' . substr($clean, 2);
        }
        if (strlen($clean) === 10 && str_starts_with($clean, '9')) {
            $clean = '0' . $clean;
        }
        return $clean;
    }

    /**
     * Check if the given phone number has been verified within the allowed hours window (default 2 hours).
     */
    public static function isPhoneVerified(string $phone, int $maxAgeHours = 2): bool
    {
        $normalizedPhone = static::normalizePhoneNumber($phone);
        if (empty($normalizedPhone)) {
            return false;
        }

        return static::where('phone_number', $normalizedPhone)
            ->whereNotNull('verified_at')
            ->where('verified_at', '>=', now()->subHours($maxAgeHours))
            ->exists();
    }
}
