<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\EquipmentUnit;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    /**
     * List all brands with equipment unit count and filter support.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Brand::query()->withCount('equipmentUnits');

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->boolean('active_only')) {
            $query->where('status', 'active');
        }

        // Return unpaginated if all=1 (ideal for dropdowns in Manage Equipment)
        if ($request->boolean('all') || $request->query('per_page') === 'all') {
            $brands = $query->orderBy('name', 'asc')->get();
            return response()->json([
                'brands' => $brands,
                'stats' => $this->getStats(),
            ]);
        }

        $perPage = min((int)$request->query('per_page', 25), 100);
        $brands = $query->orderBy('name', 'asc')->paginate($perPage);

        return response()->json([
            'brands' => $brands,
            'stats' => $this->getStats(),
        ]);
    }

    /**
     * Create a new equipment brand.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:brands,name',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        $brand = Brand::create([
            'name' => strtoupper(trim($validated['name'])),
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        // Log to audit trail
        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'BRAND_CREATED',
                'auditable_type' => 'brands',
                'auditable_id' => $brand->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'brand_name' => $brand->name,
                    'status' => $brand->status,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Brand created successfully.',
            'brand' => $brand,
        ], 201);
    }

    /**
     * Update an existing equipment brand.
     */
    public function update(Request $request, Brand $brand): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('brands', 'name')->ignore($brand->id),
            ],
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        $oldName = $brand->name;
        $newName = strtoupper(trim($validated['name']));

        $brand->update([
            'name' => $newName,
            'description' => $validated['description'] ?? $brand->description,
            'status' => $validated['status'] ?? $brand->status,
        ]);

        // If brand name changed, optionally sync with equipment_units referencing oldName
        if ($oldName !== $newName) {
            EquipmentUnit::where('brand', $oldName)->update(['brand' => $newName]);
        }

        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'BRAND_UPDATED',
                'auditable_type' => 'brands',
                'auditable_id' => $brand->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'old_name' => $oldName,
                    'new_name' => $newName,
                    'status' => $brand->status,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Brand updated successfully.',
            'brand' => $brand->loadCount('equipmentUnits'),
        ]);
    }

    /**
     * Toggle brand active/inactive status.
     */
    public function toggleStatus(Request $request, Brand $brand): JsonResponse
    {
        $newStatus = $brand->status === 'active' ? 'inactive' : 'active';
        $brand->update(['status' => $newStatus]);

        return response()->json([
            'message' => "Brand status updated to {$newStatus}.",
            'brand' => $brand->loadCount('equipmentUnits'),
        ]);
    }

    /**
     * Delete brand if not in use, or warn.
     */
    public function destroy(Request $request, Brand $brand): JsonResponse
    {
        $unitsCount = EquipmentUnit::where('brand', $brand->name)->count();

        if ($unitsCount > 0 && !$request->boolean('force')) {
            return response()->json([
                'message' => "Cannot delete brand '{$brand->name}' because {$unitsCount} physical equipment unit(s) are associated with it. Deactivate the brand instead.",
                'units_count' => $unitsCount,
            ], 422);
        }

        $brandName = $brand->name;
        $brandId = $brand->id;
        $brand->delete();

        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'BRAND_DELETED',
                'auditable_type' => 'brands',
                'auditable_id' => $brandId,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'brand_name' => $brandName,
                    'deleted_by' => $request->user()?->name,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Brand '{$brandName}' removed successfully.",
        ]);
    }

    /**
     * Get aggregate statistics for the Brands tab summary cards.
     */
    private function getStats(): array
    {
        $total = Brand::count();
        $active = Brand::where('status', 'active')->count();
        $inactive = Brand::where('status', 'inactive')->count();
        $linkedUnits = EquipmentUnit::whereNotNull('brand')->where('brand', '!=', '')->count();

        return [
            'total_brands' => $total,
            'active_brands' => $active,
            'inactive_brands' => $inactive,
            'total_linked_units' => $linkedUnits,
        ];
    }
}
