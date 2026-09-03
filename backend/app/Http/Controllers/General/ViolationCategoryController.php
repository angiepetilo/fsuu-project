<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\ViolationCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ViolationCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = ViolationCategory::where('is_active', true)->orderBy('id')->get();
        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:violation_categories,name',
            'description' => 'nullable|string|max:500',
        ]);

        $category = ViolationCategory::create([
            'name' => trim($request->input('name')),
            'description' => $request->input('description'),
            'is_active' => true,
        ]);

        return response()->json($category, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = ViolationCategory::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255|unique:violation_categories,name,' . $category->id,
            'description' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $category->update([
            'name' => trim($request->input('name')),
            'description' => $request->input('description', $category->description),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $category->is_active,
        ]);

        return response()->json($category);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = ViolationCategory::findOrFail($id);
        $category->delete();

        return response()->json(['message' => 'Violation category removed successfully.']);
    }
}
