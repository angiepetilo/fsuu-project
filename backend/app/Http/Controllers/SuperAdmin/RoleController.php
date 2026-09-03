<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RoleController — Super Admin only.
 * Handles CRUD for roles and bulk permission sync across all users of a role.
 */
class RoleController extends Controller
{
    // Fixed system roles that cannot be deleted
    private const PROTECTED_ROLES = ['staff', 'student_assistant', 'super_admin', 'sysad'];

    /**
     * List all roles with their user count.
     */
    public function index(): JsonResponse
    {
        $roles = Role::withCount('users')
            ->whereNotIn('name', ['super_admin', 'sysad'])
            ->orderBy('id')
            ->get()
            ->map(function ($role) {
                return [
                    'id'          => $role->id,
                    'name'        => $role->name,
                    'description' => $role->description,
                    'users_count' => $role->users_count,
                    'is_protected'=> in_array(str_replace(' ', '_', strtolower(trim($role->name))), ['staff', 'student_assistant', 'super_admin', 'sysad']),
                ];
            });

        return response()->json($roles);
    }

    /**
     * Create a new role.
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user() ?? auth()->user();
        if (!$authUser || !$authUser->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $cleanName = preg_replace('/\s+/', '_', strtolower(trim($validated['name'])));

        if (Role::where('name', $cleanName)->exists()) {
            return response()->json(['message' => "The role '{$cleanName}' already exists."], 422);
        }

        $role = Role::create([
            'name'        => $cleanName,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Role created successfully.',
            'role'    => array_merge($role->toArray(), ['users_count' => 0, 'is_protected' => false]),
        ], 201);
    }

    /**
     * Update a role's name/description.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user() ?? auth()->user();
        if (!$authUser || !$authUser->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $role = Role::findOrFail($id);

        if (in_array(strtolower($role->name), ['staff', 'student_assistant', 'super_admin', 'sysad'])) {
            return response()->json(['message' => 'System roles cannot be renamed.'], 422);
        }

        $validated = $request->validate([
            'name'        => 'nullable|string|max:100|unique:roles,name,' . $id,
            'description' => 'nullable|string|max:255',
        ]);

        if (!empty($validated['name'])) {
            $role->name = strtolower(trim($validated['name']));
        }
        $role->description = $validated['description'] ?? $role->description;
        $role->save();

        return response()->json([
            'message' => 'Role updated.',
            'role'    => $role->loadCount('users'),
        ]);
    }

    /**
     * Delete a role — only if no users are assigned to it.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user() ?? auth()->user();
        if (!$authUser || !$authUser->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $role = Role::withCount('users')->findOrFail($id);

        if (in_array(strtolower($role->name), self::PROTECTED_ROLES)) {
            return response()->json(['message' => 'System roles cannot be deleted.'], 422);
        }

        if ($role->users_count > 0) {
            return response()->json([
                'message' => "Cannot delete this role — {$role->users_count} user(s) are currently assigned to it.",
            ], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully.']);
    }

    /**
     * Get permissions for a given role (returns the permissions array of the first user in that role,
     * or a default empty array if no users yet).
     */
    public function getPermissions(int $id): JsonResponse
    {
        $role = Role::findOrFail($id);
        $sampleUser = User::where('role_id', $id)->whereNotNull('permissions')->first();
        $permissions = $sampleUser?->permissions ?? [];

        return response()->json([
            'role_id'     => $role->id,
            'role_name'   => $role->name,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Save permissions for a role — bulk-updates all users who have this role.
     */
    public function savePermissions(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user() ?? auth()->user();
        if (!$authUser || !$authUser->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'permissions'   => 'required|array',
            'permissions.*' => 'string',
        ]);

        $permissionsJson = json_encode($validated['permissions']);

        // Bulk-update all users of this role
        User::where('role_id', $id)->update(['permissions' => $permissionsJson]);

        return response()->json([
            'message'     => "Permissions updated for all {$role->name} accounts.",
            'permissions' => $validated['permissions'],
        ]);
    }
}
