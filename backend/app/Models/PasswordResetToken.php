<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PasswordResetToken extends Model
{
    use HasFactory;

    protected $table = 'password_reset_tokens';

    protected $fillable = [
        'email',
        'token_hash',
        'otp_hash',
        'attempts',
        'expires_at',
        'used_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'attempts'   => 'integer',
        'expires_at' => 'datetime',
        'used_at'    => 'datetime',
    ];

    /**
     * Check if this password reset request is still valid and not locked or used.
     */
    public function isValid(): bool
    {
        return $this->used_at === null
            && $this->expires_at->isFuture()
            && $this->attempts < 5;
    }

    /**
     * Check if the reset request has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Record a failed verification attempt.
     */
    public function recordFailedAttempt(): void
    {
        $this->increment('attempts');
    }
}
