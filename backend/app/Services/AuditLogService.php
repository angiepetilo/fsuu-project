<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogService
{
    public function log(
        ?User $user,
        string $action,
        ?string $auditableType = null,
        ?int $auditableId = null,
        ?array $metadata = null,
        ?string $ipAddress = null
    ): AuditLog {
        return AuditLog::create([
            'user_id'        => $user?->id ?? auth()->id(),
            'action'         => $action,
            'auditable_type' => $auditableType,
            'auditable_id'   => $auditableId,
            'metadata'       => $metadata,
            'ip_address'     => $ipAddress ?? request()?->ip(),
            'created_at'     => now(),
        ]);
    }
}