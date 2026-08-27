<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AuditLog::with(['user.role'])->latest('id');

            // 1. Filter by Action Type / Category
            $action = $request->query('action');
            if ($action && $action !== 'all') {
                if ($action === 'approvals') {
                    $query->whereIn('action', [
                        'VENUE_BOOKING_APPROVED', 'EQUIPMENT_BORROW_APPROVED',
                        'booking_approved', 'borrowing_approved', 'approved'
                    ]);
                } elseif ($action === 'rejections') {
                    $query->whereIn('action', [
                        'VENUE_BOOKING_REJECTED', 'EQUIPMENT_BORROW_REJECTED',
                        'booking_rejected', 'borrowing_rejected', 'rejected'
                    ]);
                } elseif ($action === 'users') {
                    $query->whereIn('action', ['USER_CREATED', 'USER_UPDATED', 'USER_ARCHIVED']);
                } elseif ($action === 'incidents') {
                    $query->whereIn('action', [
                        'INSPECTION_VIOLATION_LOGGED', 'DAMAGE_REPORTED', 'LOST_REPORTED',
                        'incident_logged', 'inspection_completed'
                    ]);
                } else {
                    $query->where('action', $action);
                }
            }

            // 2. Filter by User/Staff ID
            if ($request->filled('user_id')) {
                $query->where('user_id', (int)$request->query('user_id'));
            }

            // 3. Filter by Date range
            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->query('date_from'));
            }
            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->query('date_to'));
            }

            // 4. Keyword search (reference code, filer name, user name, ip)
            if ($request->filled('search')) {
                $search = trim($request->query('search'));
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                      ->orWhere('ip_address', 'like', "%{$search}%")
                      ->orWhere('metadata', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($uq) use ($search) {
                          $uq->where('name', 'like', "%{$search}%")
                             ->orWhere('email', 'like', "%{$search}%")
                             ->orWhere('first_name', 'like', "%{$search}%")
                             ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }

            $perPage = min((int)$request->query('per_page', 30), 100);
            $logs = $query->paginate($perPage);

            // Compute summary statistics
            $totalApprovals = DB::table('audit_logs')
                ->whereIn('action', ['VENUE_BOOKING_APPROVED', 'EQUIPMENT_BORROW_APPROVED', 'booking_approved', 'borrowing_approved'])
                ->count();

            $totalRejections = DB::table('audit_logs')
                ->whereIn('action', ['VENUE_BOOKING_REJECTED', 'EQUIPMENT_BORROW_REJECTED', 'booking_rejected', 'borrowing_rejected'])
                ->count();

            $totalUserMgmt = DB::table('audit_logs')
                ->whereIn('action', ['USER_CREATED', 'USER_UPDATED', 'USER_ARCHIVED'])
                ->count();

            $totalLogs = DB::table('audit_logs')->count();

            return response()->json([
                'logs' => $logs,
                'stats' => [
                    'total_approvals'  => $totalApprovals,
                    'total_rejections' => $totalRejections,
                    'total_user_mgmt'  => $totalUserMgmt,
                    'total_logs'       => $totalLogs,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'logs'  => ['data' => []],
                'stats' => ['total_approvals' => 0, 'total_rejections' => 0, 'total_user_mgmt' => 0, 'total_logs' => 0],
                'error' => $e->getMessage(),
            ], 200);
        }
    }
}
