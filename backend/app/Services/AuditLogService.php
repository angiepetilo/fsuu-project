<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogService
{
    public function log(
        ?User $user,
        string $action,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?array $changes = null,
        ?string $ipAddress = null
    ): AuditLog {
        return AuditLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'changes' => $changes,
            'ip_address' => $ipAddress,
        ]);
    }
}