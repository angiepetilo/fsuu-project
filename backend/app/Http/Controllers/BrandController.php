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
     * Ensure table and columns exist before querying.
     */
    private function ensureSchema(): void
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('brands')) {
                \Illuminate\Support\Facades\Schema::create('brands', function ($table) {
                    $table->id();
                    $table->string('name')->unique();
                    $table->unsignedBigInteger('equipment_type_id')->nullable();
                    $table->text('description')->nullable();
                    $table->string('status', 20)->default('active');
                    $table->timestamps();
                });
            } else {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('brands', 'equipment_type_id')) {
                    \Illuminate\Support\Facades\Schema::table('brands', function ($table) {
                        $table->unsignedBigInteger('equipment_type_id')->nullable()->after('name');
                    });
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('BrandController ensureSchema error: ' . $e->getMessage());
        }
    }

    /**
     * List all brands with equipment unit count and filter support.
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureSchema();

        try {
            $hasEqTypeCol = \Illuminate\Support\Facades\Schema::hasColumn('brands', 'equipment_type_id');
            $query = Brand::query();

            if ($hasEqTypeCol) {
                $query->with('equipmentType');
            }

            try {
                $query->withCount('equipmentUnits');
            } catch (\Throwable $e) {}

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

            if ($hasEqTypeCol && $request->filled('equipment_type_id')) {
                $query->where('equipment_type_id', $request->query('equipment_type_id'));
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
        } catch (\Throwable $err) {
            \Illuminate\Support\Facades\Log::error('BrandController index error: ' . $err->getMessage());
            return response()->json([
                'brands' => [],
                'stats' => [
                    'total_brands' => 0,
                    'active_brands' => 0,
                    'inactive_brands' => 0,
                    'total_linked_units' => 0,
                ],
                'error' => $err->getMessage(),
            ]);
        }
    }

    /**
     * Create a new equipment brand.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureSchema();

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:brands,name',
            'equipment_type_id' => 'nullable|exists:equipment_types,id',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        $brandData = [
            'name' => strtoupper(trim($validated['name'])),
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ];

        if (\Illuminate\Support\Facades\Schema::hasColumn('brands', 'equipment_type_id')) {
            $brandData['equipment_type_id'] = $validated['equipment_type_id'] ?? null;
        }

        $brand = Brand::create($brandData);

        if (\Illuminate\Support\Facades\Schema::hasColumn('brands', 'equipment_type_id')) {
            $brand->load('equipmentType');
        }

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
                    'equipment_type_id' => $brand->equipment_type_id,
                    'status' => $brand->status,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Brand created successfully.',
            'brand' => $brand->loadCount('equipmentUnits'),
        ], 201);
    }

    /**
     * Update an existing equipment brand.
     */
    public function update(Request $request, Brand $brand): JsonResponse
    {
        $this->ensureSchema();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('brands', 'name')->ignore($brand->id),
            ],
            'equipment_type_id' => 'nullable|exists:equipment_types,id',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        $oldName = $brand->name;
        $newName = strtoupper(trim($validated['name']));

        $updateData = [
            'name' => $newName,
            'description' => $validated['description'] ?? $brand->description,
            'status' => $validated['status'] ?? $brand->status,
        ];

        if (\Illuminate\Support\Facades\Schema::hasColumn('brands', 'equipment_type_id') && array_key_exists('equipment_type_id', $validated)) {
            $updateData['equipment_type_id'] = $validated['equipment_type_id'];
        }

        $brand->update($updateData);

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
                    'equipment_type_id' => $brand->equipment_type_id,
                    'status' => $brand->status,
                ],
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Brand updated successfully.',
            'brand' => $brand->load('equipmentType')->loadCount('equipmentUnits'),
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
            'brand' => $brand->load('equipmentType')->loadCount('equipmentUnits'),
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
