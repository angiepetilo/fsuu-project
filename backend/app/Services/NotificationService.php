<?php

namespace App\Services;

use App\Models\NotificationLog;

class NotificationService
{
    public function log(
        string $referenceType,
        int $referenceId,
        string $notificationType,
        string $channel,
        string $recipient,
        string $status = 'pending'
    ): NotificationLog {
        return NotificationLog::forceCreate([
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notification_type' => $notificationType,
            'channel' => $channel,
            'recipient' => $recipient,
            'status' => $status,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);
    }
}