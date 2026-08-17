<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Jobs\SendNewUserCredentialsJob;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user() ?? auth()->user();
            $query = User::with(['office', 'role'])->where('id', '!=', 1);

            // Exclude default superadmin email
            $query->where('email', '!=', 'admin');

            // Exclude superadmin roles safely across all SQL dialects
            $query->whereDoesntHave('role', function ($r) {
                $r->whereIn('name', ['super_admin', 'super-admin', 'superadmin', 'sysad', 'Super Admin', 'Superadmin', 'SYSAD']);
            });

            if ($user && !$user->isSuperAdmin()) {
                $officeId = $user->office_id;
                $userId = $user->id;

                $query->where('id', '!=', $userId)
                ->where(function ($q) use ($officeId, $userId) {
                    if ($officeId) {
                        $q->where('office_id', $officeId);
                    }
                    $q->orWhere('created_by', $userId);
                })
                ->whereDoesntHave('role', function ($r) {
                    $r->whereIn('name', ['admin', 'office_manager', 'branch_admin', 'Admin', 'Branch Admin']);
                });
            }

            return response()->json($query->latest()->get());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('UserController index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Store a newly created user (Branch Admin).
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user() ?? auth()->user();
        if (!$authUser || !$authUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized action'], 403);
        }

        $validated = $request->validate([
            'name'           => 'nullable|string|max:255',
            'email'          => 'nullable|email|max:255|unique:users,email',
            'personal_email' => 'required_without:email|nullable|email|max:255',
            'role'           => 'nullable|string',
            'office_id'      => 'nullable|exists:offices,id',
            'location'       => 'nullable|string|max:255',
            'image'          => 'nullable|image|max:2048',
            'permissions'    => 'nullable',
        ]);

        $isSuperAdmin = $authUser->isSuperAdmin();
        $officeId = $authUser->office_id;

        $roleName = $validated['role'] ?? 'staff';
        // Non-superadmins cannot create high-privilege roles (super_admin, sysad, admin, office_manager)
        if (!$isSuperAdmin) {
            $normalizedRole = strtolower(str_replace(['-', '_', ' '], '', $roleName));
            if (in_array($normalizedRole, ['superadmin', 'sysad', 'admin', 'officemanager', 'branchadmin'])) {
                return response()->json(['message' => 'Unauthorized to assign administrative or manager roles.'], 403);
            }
            $validated['office_id'] = $officeId;
        }

        $targetRole = Role::firstOrCreate(['name' => $roleName]);

        $permissions = $request->input('permissions');
        if (is_string($permissions)) {
            $permissions = json_decode($permissions, true) ?? [];
        }

        $targetEmail = trim($validated['email'] ?? $validated['personal_email']);

        // Name is only set if explicitly provided, otherwise placeholder for NOT NULL constraint
        $name = (!empty($validated['name']) && trim($validated['name']) !== '') ? trim($validated['name']) : 'Pending Activation';

        // Auto-generate temporary password: 4 random chars + 4 random digits
        $plainPassword = Str::random(4) . rand(1000, 9999);
        $inviteToken = Str::random(40);

        $avatarPath = null;
        if ($request->hasFile('image')) {
            $avatarPath = app(\App\Services\MediaUploadService::class)->upload($request->file('image'), 'avatars');
        } elseif (!empty($validated['avatar'])) {
            $avatarPath = app(\App\Services\MediaUploadService::class)->upload($validated['avatar'], 'avatars');
        }

        // Auto-assign matching office_id if empty but location is provided
        if (empty($validated['office_id']) && !empty($validated['location']) && $isSuperAdmin) {
            $matchedOffice = \App\Models\Office::where('location', $validated['location'])->first()
                ?? \App\Models\Office::where('name', 'LIKE', '%' . $validated['location'] . '%')->first();
            if ($matchedOffice) {
                $validated['office_id'] = $matchedOffice->id;
            }
        }

        $user = User::create([
            'name'           => $name,
            'email'          => $targetEmail,
            'personal_email' => $targetEmail,
            'password'       => Hash::make($plainPassword),
            'role_id'        => $targetRole->id,
            'office_id'      => $validated['office_id'] ?? $officeId,
            'location'       => $validated['location'] ?? null,
            'avatar'         => $avatarPath ? Storage::url($avatarPath) : null,
            'permissions'    => $permissions,
            'invite_token'   => $inviteToken,
            'invited_at'     => now(),
            'status'         => 'pending_activation',
            'is_active'      => true,
            'created_by'     => auth()->id(),
        ]);

        $user->load(['office', 'role']);

        // Dispatch clean formal credentials email job
        try {
            SendNewUserCredentialsJob::dispatch($user, $plainPassword);
        } catch (\Throwable $e) {
            // Silently log or handle if mail driver fails
        }

        return response()->json([
            'message'        => 'User invitation sent successfully.',
            'user'           => $user,
            'temp_password'  => $plainPassword,
            'invite_token'   => $inviteToken,
        ], 201);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $targetUser = User::with('role')->findOrFail($id);
        $authUser = $request->user() ?? auth()->user();
        $isSuperAdmin = $authUser ? $authUser->isSuperAdmin() : false;
        $officeId = $authUser ? $authUser->office_id : null;

        // Non-superadmin authorization checks:
        if (!$isSuperAdmin) {
            if ($targetUser->isSuperAdmin() || $targetUser->isAdmin()) {
                return response()->json(['message' => 'Unauthorized to modify administrative accounts.'], 403);
            }
            if ($officeId && (int)$targetUser->office_id !== (int)$officeId) {
                return response()->json(['message' => 'Unauthorized to modify accounts from another office.'], 403);
            }
        }

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'email'          => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($targetUser->id)],
            'personal_email' => 'nullable|email|max:255',
            'role'           => 'nullable|string',
            'office_id'      => 'nullable|exists:offices,id',
            'location'       => 'nullable|string|max:255',
            'new_password'   => 'nullable|string|min:6',
            'permissions'    => 'nullable',
        ]);

        if (isset($validated['name'])) $targetUser->name = $validated['name'];
        if (isset($validated['email'])) $targetUser->email = $validated['email'];
        if (isset($validated['personal_email'])) $targetUser->personal_email = $validated['personal_email'];

        if ($isSuperAdmin) {
            if (array_key_exists('office_id', $validated)) {
                $targetUser->office_id = $validated['office_id'];
            } elseif (!empty($validated['location'])) {
                $matchedOffice = \App\Models\Office::where('location', $validated['location'])->first()
                    ?? \App\Models\Office::where('name', 'LIKE', '%' . $validated['location'] . '%')->first();
                if ($matchedOffice) {
                    $targetUser->office_id = $matchedOffice->id;
                }
            }
            if (!empty($validated['role'])) {
                $r = Role::firstOrCreate(['name' => $validated['role']]);
                $targetUser->role_id = $r->id;
            }
        } else {
            // Non-superadmin cannot change user's office or elevate role
            if (!empty($validated['role'])) {
                $normalizedRole = strtolower(str_replace(['-', '_', ' '], '', $validated['role']));
                if (in_array($normalizedRole, ['superadmin', 'sysad', 'admin', 'officemanager', 'branchadmin'])) {
                    return response()->json(['message' => 'Unauthorized to elevate account to administrative roles.'], 403);
                }
                $r = Role::firstOrCreate(['name' => $validated['role']]);
                $targetUser->role_id = $r->id;
            }
        }

        if (array_key_exists('location', $validated)) $targetUser->location = $validated['location'];

        if ($request->has('permissions')) {
            $perms = $request->input('permissions');
            if (is_string($perms)) {
                $perms = json_decode($perms, true);
            }
            $targetUser->permissions = $perms;
        }

        if (!empty($validated['new_password'])) {
            $targetUser->password = Hash::make($validated['new_password']);
        }

        $targetUser->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $targetUser->load(['office', 'role']),
        ]);
    }

    /**
     * Soft-remove the specified user.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $targetUser = User::with('role')->findOrFail($id);
        $authUser = $request->user() ?? auth()->user();
        $isSuperAdmin = $authUser ? $authUser->isSuperAdmin() : false;
        $officeId = $authUser ? $authUser->office_id : null;

        if ($authUser && $authUser->id === $targetUser->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        if (!$isSuperAdmin) {
            if ($targetUser->isSuperAdmin() || $targetUser->isAdmin()) {
                return response()->json(['message' => 'Unauthorized to delete administrative accounts.'], 403);
            }
            if ($officeId && (int)$targetUser->office_id !== (int)$officeId) {
                return response()->json(['message' => 'Unauthorized to delete accounts from another office.'], 403);
            }
        }

        $targetUser->delete();

        return response()->json(['message' => 'User archived (soft-deleted) successfully']);
    }

    /**
     * Resend account activation invitation email.
     */
    public function resendInvite(Request $request, int $id): JsonResponse
    {
        $targetUser = User::findOrFail($id);
        $authUser = $request->user() ?? auth()->user();
        $isSuperAdmin = $authUser ? $authUser->isSuperAdmin() : false;
        $officeId = $authUser ? $authUser->office_id : null;

        if (!$isSuperAdmin && $officeId && (int)$targetUser->office_id !== (int)$officeId) {
            return response()->json(['message' => 'Unauthorized to manage accounts from another office.'], 403);
        }

        if (!$targetUser->invite_token) {
            $targetUser->invite_token = Str::random(40);
        }
        $targetUser->invited_at = now();
        $targetUser->save();

        $plainPassword = Str::random(4) . rand(1000, 9999);

        try {
            SendNewUserCredentialsJob::dispatch($targetUser, $plainPassword);
        } catch (\Throwable $e) {
            // Silently log or handle if mail driver fails
        }

        return response()->json([
            'message' => 'Invitation email resent successfully to ' . ($targetUser->personal_email ?? $targetUser->email),
            'user'    => $targetUser,
        ]);
    }
}
