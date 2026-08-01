<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Office;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Department::with('office')->latest();

        // Office-scope: non-superadmin sees only their office
        if ($user && !$user->isSuperAdmin() && $user->office_id) {
            $query->where('office_id', $user->office_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'office_id'       => 'nullable|exists:offices,id',
            'code'            => 'required|string|max:20',
            'name'            => 'required|string|max:255',
            'campus_location' => 'nullable|string|max:255',
        ]);

        if (empty($data['office_id']) && !empty($data['campus_location'])) {
            $matchedOffice = Office::where('location', $data['campus_location'])->first();
            $data['office_id'] = $matchedOffice?->id ?? Office::first()?->id;
        }

        $dept = Department::create($data);

        return response()->json($dept->load('office'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);

        $data = $request->validate([
            'office_id'       => 'nullable|exists:offices,id',
            'code'            => 'sometimes|string|max:20',
            'name'            => 'sometimes|string|max:255',
            'campus_location' => 'nullable|string|max:255',
        ]);

        if (empty($data['office_id']) && !empty($data['campus_location'])) {
            $matchedOffice = Office::where('location', $data['campus_location'])->first();
            $data['office_id'] = $matchedOffice?->id ?? $dept->office_id;
        }

        $dept->update($data);

        return response()->json($dept->load('office'));
    }

    public function destroy(int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        $dept->delete();

        return response()->json(['message' => 'Department archived (soft-deleted)']);
    }
}
