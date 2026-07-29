<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificationService
{
    public function log(
        string $referenceType,
        int $referenceId,
        string $notificationType,
        string $channel,
        string $recipient,
        string $status = 'pending'
    ) {
        if (Schema::hasTable('notification_logs')) {
            return DB::table('notification_logs')->insert([
                'reference_type'    => $referenceType,
                'reference_id'      => $referenceId,
                'notification_type' => $notificationType,
                'channel'           => $channel,
                'recipient'         => $recipient,
                'status'            => $status,
                'sent_at'           => $status === 'sent' ? now() : null,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
        }
        return null;
    }
}