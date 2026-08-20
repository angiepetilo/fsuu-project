<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CategoryRequest;
use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = CategoryRequest::with(['office', 'requester']);

        if ($user && $user->office_id && !$user->isSuperAdmin()) {
            $query->where('office_id', $user->office_id);
        }

        $requests = $query->latest()->get();

        return response()->json($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'proposed_name' => 'required|string|max:255',
            'reason' => 'nullable|string',
        ]);

        $user = $request->user();

        $catReq = CategoryRequest::create([
            'proposed_name' => trim($request->input('proposed_name')),
            'reason' => $request->input('reason'),
            'office_id' => $user->office_id ?? null,
            'requested_by' => $user->id,
            'status' => 'pending',
        ]);

        return response()->json($catReq->load(['office', 'requester']), 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $catReq = CategoryRequest::findOrFail($id);

        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        // Non-superadmin can only approve category requests belonging to their own office
        if (!$isSuperAdmin && $officeId && (int)$catReq->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to approve category requests from another office.'], 403);
        }

        // Check if category already exists in EquipmentType
        $existing = EquipmentType::where('office_id', $catReq->office_id)
            ->where('eq_name', $catReq->proposed_name)
            ->first();

        if (!$existing) {
            $existing = EquipmentType::create([
                'eq_name'          => $catReq->proposed_name,
                'eq_type'          => 'AV Equipment',
                'status'           => 'available',
                'total_quantity'   => 0,
                'available_count'  => 0,
                'office_id'        => $catReq->office_id,
            ]);
        }

        $catReq->update([
            'status' => 'approved',
            'admin_notes' => $request->input('admin_notes', 'Approved by ' . ($isSuperAdmin ? 'Super Admin' : 'Office Manager') . '.'),
        ]);

        return response()->json([
            'message' => 'Category request approved and added to master category list!',
            'request' => $catReq,
            'category' => $existing,
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $catReq = CategoryRequest::findOrFail($id);

        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        // Non-superadmin can only reject category requests belonging to their own office
        if (!$isSuperAdmin && $officeId && (int)$catReq->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to reject category requests from another office.'], 403);
        }

        $catReq->update([
            'status' => 'rejected',
            'admin_notes' => $request->input('admin_notes', 'Rejected by ' . ($isSuperAdmin ? 'Super Admin' : 'Office Manager') . '.'),
        ]);

        return response()->json([
            'message' => 'Category request rejected.',
            'request' => $catReq,
        ]);
    }
}
