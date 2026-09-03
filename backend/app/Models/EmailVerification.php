<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailVerification extends Model
{
    use HasFactory;

    protected $table = 'email_verifications';

    protected $fillable = [
        'email',
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
     * Check if the given email has been verified within the allowed hours window (default 2 hours).
     */
    public static function isEmailVerified(string $email, int $maxAgeHours = 2): bool
    {
        $normalizedEmail = strtolower(trim($email));
        if (empty($normalizedEmail)) {
            return false;
        }

        return static::where('email', $normalizedEmail)
            ->whereNotNull('verified_at')
            ->where('verified_at', '>=', now()->subHours($maxAgeHours))
            ->exists();
    }
}
