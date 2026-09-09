<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\SecurityAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SecurityAlertController extends Controller
{
    /**
     * List all security alerts and abnormal activities with filters and summary stats.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SecurityAlert::with(['user.role', 'resolver'])->latest('id');

        // 1. Filter by event_type (e.g. rate_limit_breach, login_lockout, forced_session_termination)
        if ($request->filled('event_type') && $request->query('event_type') !== 'all') {
            $query->where('event_type', $request->query('event_type'));
        }

        // 2. Filter by severity
        if ($request->filled('severity') && $request->query('severity') !== 'all') {
            $query->where('severity', $request->query('severity'));
        }

        // 3. Filter by resolution status
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // 4. Date filtering
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        // 5. Keyword search
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min((int)$request->query('per_page', 25), 100);
        $alerts = $query->paginate($perPage);

        // Calculate summary counters
        $totalIncidents = SecurityAlert::count();
        $rateLimitBreaches = SecurityAlert::where('event_type', 'rate_limit_breach')->count();
        $loginLockouts = SecurityAlert::where('event_type', 'login_lockout')->count();
        $forcedTerminations = SecurityAlert::where('event_type', 'forced_session_termination')->count();
        $unresolvedCount = SecurityAlert::where('status', 'unresolved')->count();

        return response()->json([
            'alerts' => $alerts,
            'stats' => [
                'total_incidents' => $totalIncidents,
                'rate_limit_breaches' => $rateLimitBreaches,
                'login_lockouts' => $loginLockouts,
                'forced_terminations' => $forcedTerminations,
                'unresolved_count' => $unresolvedCount,
            ],
        ]);
    }

    /**
     * Mark a security alert as resolved or dismissed.
     */
    public function resolve(Request $request, SecurityAlert $securityAlert): JsonResponse
    {
        $status = $request->input('status', 'resolved');
        if (!in_array($status, ['resolved', 'dismissed', 'investigating', 'unresolved'])) {
            $status = 'resolved';
        }

        $admin = $request->user();
        $securityAlert->update([
            'status' => $status,
            'resolved_at' => in_array($status, ['resolved', 'dismissed']) ? now() : null,
            'resolved_by' => in_array($status, ['resolved', 'dismissed']) ? $admin?->id : null,
        ]);

        try {
            AuditLog::create([
                'user_id' => $admin?->id,
                'action' => 'SECURITY_ALERT_' . strtoupper($status),
                'auditable_type' => 'security_alerts',
                'auditable_id' => $securityAlert->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'alert_title' => $securityAlert->title,
                    'status' => $status,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Security alert marked as {$status}.",
            'alert' => $securityAlert->fresh(['user.role', 'resolver']),
        ]);
    }

    /**
     * Delete security alert record.
     */
    public function destroy(Request $request, SecurityAlert $securityAlert): JsonResponse
    {
        $securityAlert->delete();
        return response()->json([
            'message' => 'Security alert record removed.',
        ]);
    }
}
