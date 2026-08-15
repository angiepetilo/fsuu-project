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
        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? ($user->office_id ?? $user->office?->id) : null;

        $query = EquipmentType::with([
            'office',
            'units' => function ($q) {
                $q->whereNull('archived_at');
            }
        ]);

        if (!$isSuperAdmin && $officeId) {
            $query->where('office_id', $officeId);
        } elseif ($isSuperAdmin && $request->filled('office_id') && $request->query('office_id') !== 'all') {
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
        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        $validated = $request->validate([
            'office_id'        => 'required|integer',
            'eq_name'          => 'required|string|max:255',
            'eq_type'          => 'required|string|max:255',
            'barcode'          => 'nullable|string|max:255',
            'avatar'           => 'nullable|string',
            'total_quantity'   => 'required|integer|min:0',
            'available_count'  => 'nullable|integer|min:0',
            'date_purchased'   => 'nullable|date',
            'lifespan_years'   => 'nullable|integer|min:1',
            'status'           => 'nullable|string',
            'description'      => 'nullable|string',
        ]);

        if (!$isSuperAdmin && $officeId) {
            $validated['office_id'] = $officeId;
        }

        // Same-office duplicate check (Hard block to prevent stock fragmentation)
        if ($this->categoryService->hasSameOfficeDuplicate($validated['eq_name'], (int)$validated['office_id'])) {
            return response()->json([
                'message' => "A category named '{$validated['eq_name']}' already exists in this office. Please manage stock units under the existing category rather than creating a duplicate row.",
                'errors'  => [
                    'eq_name' => ["Duplicate category name already registered in this office."]
                ]
            ], 422);
        }

        // Cross-office near-duplicate check (Advisory warning only)
        $warning = $this->categoryService->checkNearDuplicateWarning($validated['eq_name'], (int)$validated['office_id']);

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

        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        if (!$isSuperAdmin && $officeId && (int)$type->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to modify equipment categories from another office.'], 403);
        }

        $checkName = $request->input('eq_name', $type->eq_name);
        $checkOffice = (int)$request->input('office_id', $type->office_id);

        if (!$isSuperAdmin && $officeId) {
            $checkOffice = $officeId;
        }

        if ($request->has('eq_name') || $request->has('office_id')) {
            if ($this->categoryService->hasSameOfficeDuplicate($checkName, $checkOffice, $type->id)) {
                return response()->json([
                    'message' => "A category named '{$checkName}' already exists in this office. Please manage stock units under the existing category.",
                    'errors'  => [
                        'eq_name' => ["Duplicate category name already registered in this office."]
                    ]
                ], 422);
            }
        }

        $updateData = $request->all();
        if (!$isSuperAdmin && $officeId) {
            $updateData['office_id'] = $officeId;
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

        $user = $request->user();
        $isSuperAdmin = $user ? $user->isSuperAdmin() : false;
        $officeId = $user ? $user->office_id : null;

        if (!$isSuperAdmin && $officeId && (int)$type->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to delete equipment categories from another office.'], 403);
        }

        $type->delete();
        return response()->json(['message' => 'Equipment type deleted']);
    }
}
