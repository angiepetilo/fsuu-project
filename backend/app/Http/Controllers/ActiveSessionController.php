<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\SecurityAlert;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class ActiveSessionController extends Controller
{
    /**
     * List all active sessions with user, role, timing, and real-time status.
     * Columns: User / Account | Role | Session Started | Last Active | Session Status | Action
     */
    public function index(Request $request): JsonResponse
    {
        $query = PersonalAccessToken::query()
            ->where('tokenable_type', User::class)
            ->with(['tokenable.role'])
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at');

        // Optional search by user name, email, or ip
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', "%{$search}%")
                  ->orWhere('device_name', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhereHasMorph('tokenable', [User::class], function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%")
                         ->orWhere('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // Optional filter by role
        if ($request->filled('role') && $request->query('role') !== 'all') {
            $role = $request->query('role');
            $query->whereHasMorph('tokenable', [User::class], function ($uq) use ($role) {
                $uq->whereHas('role', function ($rq) use ($role) {
                    $rq->where('name', $role);
                });
            });
        }

        $allTokens = $query->get();
        $now = now();
        $currentTokenId = $request->user()?->currentAccessToken()?->id;

        $mapped = $allTokens->map(function ($token) use ($now, $currentTokenId) {
            $user = $token->tokenable;
            $roleName = $user?->role?->name ?? 'Staff';
            
            $lastActive = $token->last_used_at ?? $token->created_at;
            $diffMinutes = $lastActive ? $now->diffInMinutes($lastActive) : 999;

            // Determine Session Status
            if ($token->is_revoked) {
                $sessionStatus = 'terminated';
            } elseif ($diffMinutes <= 15) {
                $sessionStatus = 'active';
            } else {
                $sessionStatus = 'idle';
            }

            return [
                'id' => $token->id,
                'is_current' => ($token->id === $currentTokenId),
                'user' => [
                    'id' => $user?->id,
                    'name' => $user?->name ?? 'Unknown User',
                    'email' => $user?->email ?? $user?->email_address ?? 'N/A',
                    'avatar' => $user?->avatar ?? null,
                    'location' => $user?->location ?? 'Main Campus',
                ],
                'role' => ucfirst(str_replace('_', ' ', $roleName)),
                'role_raw' => $roleName,
                'session_started' => $token->created_at ? $token->created_at->toIso8601String() : null,
                'last_active' => $lastActive ? $lastActive->toIso8601String() : null,
                'session_status' => $sessionStatus,
                'ip_address' => $token->ip_address ?? '127.0.0.1',
                'user_agent' => $token->user_agent,
                'device_name' => $token->device_name ?? $token->name ?? 'Desktop Terminal',
                'is_revoked' => (bool)$token->is_revoked,
                'revoked_at' => $token->revoked_at ? $token->revoked_at->toIso8601String() : null,
            ];
        });

        // Filter by computed status if requested
        $statusFilter = $request->query('status');
        if ($statusFilter && $statusFilter !== 'all') {
            $mapped = $mapped->filter(function ($item) use ($statusFilter) {
                return $item['session_status'] === $statusFilter;
            })->values();
        }

        // Summary stats
        $totalSessions = $allTokens->count();
        $activeNow = $allTokens->filter(fn($t) => !$t->is_revoked && ($t->last_used_at ?? $t->created_at) && $now->diffInMinutes($t->last_used_at ?? $t->created_at) <= 15)->count();
        $idleSessions = $allTokens->filter(fn($t) => !$t->is_revoked && (!$t->last_used_at || $now->diffInMinutes($t->last_used_at ?? $t->created_at) > 15))->count();
        $terminatedCount = $allTokens->where('is_revoked', true)->count();

        return response()->json([
            'sessions' => $mapped,
            'stats' => [
                'total_sessions' => $totalSessions,
                'active_now' => $activeNow,
                'idle_sessions' => $idleSessions,
                'terminated_sessions' => $terminatedCount,
            ],
        ]);
    }

    /**
     * Remotely terminate an active cashier/admin session in real time.
     * Revokes the Sanctum token immediately and logs a security incident.
     */
    public function terminate(Request $request, $id): JsonResponse
    {
        $token = PersonalAccessToken::find($id);

        if (!$token) {
            return response()->json(['message' => 'Session not found or already terminated.'], 404);
        }

        $admin = $request->user();
        $targetUser = $token->tokenable;
        $roleName = $targetUser?->role?->name ?? 'Staff';
        $ip = $token->ip_address ?? $request->ip();
        $reason = $request->input('reason', 'Remotely terminated by administrator due to security policy or unattended terminal.');

        // Mark as revoked and delete/deactivate so Sanctum rejects any further requests
        $token->update([
            'is_revoked' => true,
            'revoked_at' => now(),
            'revoked_by' => $admin?->id,
        ]);

        // Delete token to invalidate Sanctum cache immediately
        $token->delete();

        // 1. Automated Security Alert log
        try {
            SecurityAlert::create([
                'event_type' => 'forced_session_termination',
                'severity' => 'critical',
                'title' => 'Forced Terminal Session Termination',
                'description' => "Administrator {$admin?->name} remotely terminated active session for {$targetUser?->name} (Role: {$roleName}) on IP {$ip}. Reason: {$reason}",
                'ip_address' => $ip,
                'user_agent' => $token->user_agent,
                'user_id' => $targetUser?->id,
                'metadata' => [
                    'terminated_by_id' => $admin?->id,
                    'terminated_by_name' => $admin?->name,
                    'target_user_id' => $targetUser?->id,
                    'target_user_name' => $targetUser?->name,
                    'target_role' => $roleName,
                    'token_id' => $id,
                    'reason' => $reason,
                ],
                'status' => 'resolved',
                'resolved_at' => now(),
                'resolved_by' => $admin?->id,
            ]);
        } catch (\Throwable $e) {}

        // 2. Audit Trail log
        try {
            AuditLog::create([
                'user_id' => $admin?->id,
                'action' => 'SESSION_FORCE_TERMINATED',
                'auditable_type' => 'personal_access_tokens',
                'auditable_id' => (int)$id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'target_user' => $targetUser?->name,
                    'target_role' => $roleName,
                    'reason' => $reason,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Session for {$targetUser?->name} ({$roleName}) has been terminated in real time.",
        ]);
    }
}
