<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommunicationLog extends Model
{
    use HasFactory;

    protected $table = 'communication_logs';

    protected $fillable = [
        'channel',
        'category',
        'recipient_name',
        'recipient_email',
        'recipient_phone',
        'reference_code',
        'subject',
        'message_preview',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    /**
     * Record a communication log entry.
     */
    public static function record(array $data): ?self
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('communication_logs')) {
                return null;
            }
            return self::create(array_merge([
                'sent_at' => now(),
                'status'  => 'sent',
            ], $data));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('CommunicationLog record failed: ' . $e->getMessage());
            return null;
        }
    }
}
