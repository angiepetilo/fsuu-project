<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::latest();
        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'            => 'required|string|max:20',
            'name'            => 'required|string|max:255',
            'campus_location' => 'nullable|string|max:255',
        ]);

        $dept = Department::create($data);

        return response()->json($dept, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);

        $data = $request->validate([
            'code'            => 'sometimes|string|max:20',
            'name'            => 'sometimes|string|max:255',
            'campus_location' => 'nullable|string|max:255',
        ]);

        $dept->update($data);

        return response()->json($dept);
    }

    public function destroy(int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        $dept->delete();

        return response()->json(['message' => 'Department archived (soft-deleted)']);
    }
}
