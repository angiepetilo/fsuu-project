<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EquipmentType;
use App\Services\EquipmentCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipmentTypeController extends Controller
{
    public function __construct(
        protected EquipmentCategoryService $categoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = EquipmentType::with([
            'units' => function ($q) {
                $q->whereNull('archived_at');
            }
        ]);

        $types = $query->latest()->get()->map(
            fn(EquipmentType $e) => $this->categoryService->formatCategoryResponse($e)
        );

        return response()->json($types);
    }

    public function show($id): JsonResponse
    {
        $type = EquipmentType::with(['units'])->findOrFail($id);
        return response()->json($type);
    }

    public function store(Request $request): JsonResponse
    {
        $name = $request->input('eq_name', $request->input('name'));
        if (!$name) {
            return response()->json([
                'message' => 'The equipment name or category field is required.',
                'errors'  => ['eq_name' => ['The equipment name field is required.']]
            ], 422);
        }

        $validated = $request->validate([
            'eq_name'          => 'nullable|string|max:255',
            'name'             => 'nullable|string|max:255',
            'brand'            => 'nullable|string|max:255',
            'avatar'           => 'nullable|string',
            'total_quantity'   => 'nullable|integer|min:0',
            'available_count'  => 'nullable|integer|min:0',
            'damaged_count'    => 'nullable|integer|min:0',
            'lost_count'       => 'nullable|integer|min:0',
            'released_count'   => 'nullable|integer|min:0',
            'date_purchased'   => 'nullable|date',
            'lifespan_years'   => 'nullable|integer|min:1',
            'status'           => 'nullable|string',
            'description'      => 'nullable|string',
        ]);
        $validated['eq_name'] = $name;
        unset($validated['name']);

        // Duplicate name check
        if ($this->categoryService->hasDuplicateName($validated['eq_name'])) {
            return response()->json([
                'message' => "A category named '{$validated['eq_name']}' already exists.",
                'errors'  => [
                    'eq_name' => ["Duplicate category name already registered."]
                ]
            ], 422);
        }

        if (!empty($validated['avatar'])) {
            $validated['avatar'] = app(\App\Services\MediaUploadService::class)->upload($validated['avatar'], 'equipment_types');
        }

        $type = EquipmentType::create($validated);

        return response()->json($type, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);

        $checkName = $request->input('eq_name', $type->eq_name);

        if ($request->has('eq_name')) {
            if ($this->categoryService->hasDuplicateName($checkName, $type->id)) {
                return response()->json([
                    'message' => "A category named '{$checkName}' already exists.",
                    'errors'  => [
                        'eq_name' => ["Duplicate category name already registered."]
                    ]
                ], 422);
            }
        }

        $updateData = $request->all();

        if (array_key_exists('avatar', $updateData) && !empty($updateData['avatar'])) {
            $updateData['avatar'] = app(\App\Services\MediaUploadService::class)->upload($updateData['avatar'], 'equipment_types');
        }

        $type->update($updateData);

        return response()->json($type);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);
        $type->delete();
        return response()->json(['message' => 'Equipment category deleted successfully']);
    }
}
