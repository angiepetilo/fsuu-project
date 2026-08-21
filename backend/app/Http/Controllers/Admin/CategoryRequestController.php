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
        $query = CategoryRequest::with(['requester']);
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
            'requested_by' => $user->id,
            'status' => 'pending',
        ]);

        return response()->json($catReq->load(['requester']), 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $catReq = CategoryRequest::findOrFail($id);

        // Check if category already exists in EquipmentType
        $existing = EquipmentType::where('eq_name', $catReq->proposed_name)->first();

        if (!$existing) {
            $existing = EquipmentType::create([
                'eq_name'          => $catReq->proposed_name,
                'eq_type'          => 'AV Equipment',
                'status'           => 'available',
                'total_quantity'   => 0,
                'available_count'  => 0,
            ]);
        }

        $catReq->update([
            'status' => 'approved',
            'admin_notes' => $request->input('admin_notes', 'Approved.'),
        ]);

        return response()->json([
            'message' => 'Category request approved and added to master category list!',
            'request' => $catReq,
            'category' => $existing,
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $catReq = CategoryRequest::findOrFail($id);

        $catReq->update([
            'status' => 'rejected',
            'admin_notes' => $request->input('admin_notes', 'Rejected.'),
        ]);

        return response()->json([
            'message' => 'Category request rejected.',
            'request' => $catReq,
        ]);
    }
}
