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
            'office',
            'units' => function ($q) {
                $q->whereNull('archived_at');
            }
        ]);

        if ($request->filled('office_id') && $request->query('office_id') !== 'all') {
            $query->where('office_id', $request->query('office_id'));
        }

        $types = $query->latest()->get()->map(
            fn(EquipmentType $e) => $this->categoryService->formatCategoryResponse($e)
        );

        return response()->json($types);
    }

    public function show($id): JsonResponse
    {
        $type = EquipmentType::with(['office', 'units'])->findOrFail($id);
        return response()->json($type);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'office_id'        => 'nullable|integer',
            'eq_name'          => 'required|string|max:255',
            'eq_type'          => 'required|string|max:255',
            'barcode'          => 'nullable|string|max:255',
            'avatar'           => 'nullable|string',
            'total_quantity'   => 'nullable|integer|min:0',
            'available_count'  => 'nullable|integer|min:0',
            'date_purchased'   => 'nullable|date',
            'lifespan_years'   => 'nullable|integer|min:1',
            'status'           => 'nullable|string',
            'description'      => 'nullable|string',
        ]);

        if (empty($validated['office_id'])) {
            $user = $request->user();
            $validated['office_id'] = $user?->office_id ?? \App\Models\Office::first()?->id ?? 1;
        }

        // Same-office duplicate check (Hard block to prevent stock fragmentation)
        if ($this->categoryService->hasSameOfficeDuplicate($validated['eq_name'], (int)$validated['office_id'])) {
            return response()->json([
                'message' => "A category named '{$validated['eq_name']}' already exists in this office.",
                'errors'  => [
                    'eq_name' => ["Duplicate category name already registered in this office."]
                ]
            ], 422);
        }

        // Cross-office near-duplicate check (Advisory warning only)
        $warning = $this->categoryService->checkNearDuplicateWarning($validated['eq_name'], (int)$validated['office_id']);

        if (!empty($validated['avatar'])) {
            $validated['avatar'] = app(\App\Services\MediaUploadService::class)->upload($validated['avatar'], 'equipment_types');
        }

        $type = EquipmentType::create($validated);
        $type->load('office');

        $response = $type->toArray();
        if ($warning) {
            $response['warning'] = $warning;
        }

        return response()->json($response, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);

        $checkName = $request->input('eq_name', $type->eq_name);
        $checkOffice = (int)$request->input('office_id', $type->office_id);

        if ($request->has('eq_name') || $request->has('office_id')) {
            if ($this->categoryService->hasSameOfficeDuplicate($checkName, $checkOffice, $type->id)) {
                return response()->json([
                    'message' => "A category named '{$checkName}' already exists in this office.",
                    'errors'  => [
                        'eq_name' => ["Duplicate category name already registered in this office."]
                    ]
                ], 422);
            }
        }

        $updateData = $request->all();

        if (array_key_exists('avatar', $updateData) && !empty($updateData['avatar'])) {
            $updateData['avatar'] = app(\App\Services\MediaUploadService::class)->upload($updateData['avatar'], 'equipment_types');
        }

        $type->update($updateData);
        $type->load('office');

        $warning = $this->categoryService->checkNearDuplicateWarning($checkName, $checkOffice, $type->id);

        $response = $type->toArray();
        if ($warning) {
            $response['warning'] = $warning;
        }

        return response()->json($response);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);
        $type->delete();
        return response()->json(['message' => 'Equipment category deleted successfully']);
    }
}
