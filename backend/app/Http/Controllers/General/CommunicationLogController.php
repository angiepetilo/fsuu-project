<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\CommunicationLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunicationLogController extends Controller
{
    /**
     * GET /api/general/communication-logs
     * Returns paginated communication dispatch logs with filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CommunicationLog::query()->latest('id');

        if ($request->filled('channel')) {
            $query->where('channel', $request->query('channel'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->query('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('recipient_name', 'like', $search)
                  ->orWhere('recipient_email', 'like', $search)
                  ->orWhere('recipient_phone', 'like', $search)
                  ->orWhere('reference_code', 'like', $search)
                  ->orWhere('subject', 'like', $search);
            });
        }

        $perPage = (int) $request->query('per_page', 15);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }
}
