<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Jobs\SendNewUserCredentialsJob;
use App\Rules\ActiveDeliverableEmail;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLog
    ) {}

    /**
     * Display a listing of the users.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user() ?? auth()->user();
            $query = User::with(['role'])->where('id', '!=', 1);

            // Exclude default superadmin email
            $query->where('email', '!=', 'admin');

            // Exclude superadmin roles safely across all SQL dialects
            $query->whereDoesntHave('role', function ($r) {
                $r->whereIn('name', ['super_admin', 'super-admin', 'superadmin', 'sysad', 'Super Admin', 'Superadmin', 'SYSAD']);
            });

            if ($user && !$user->isSuperAdmin()) {
                $userId = $user->id;

                $query->where('id', '!=', $userId)
                ->where(function ($q) use ($userId) {
                    $q->where('created_by', $userId);
                });
            }

            return response()->json($query->latest()->get());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('UserController index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Store a newly created user (email-only invitation).
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user() ?? auth()->user();
        if (!$authUser || !$authUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized action'], 403);
        }

        $validated = $request->validate([
            'name'           => 'nullable|string|max:255',
            'first_name'     => 'nullable|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'nullable|string|max:255',
            'suffix'         => 'nullable|string|max:50',
            'email_address'  => ['nullable', 'email', 'max:255', 'unique:users,email_address', new ActiveDeliverableEmail],
            'email'          => ['required_without:email_address', 'nullable', 'email', 'max:255', new ActiveDeliverableEmail],
            'role'           => 'nullable|string',
            'role_id'        => 'nullable|integer',
            'location'       => 'nullable|string|max:255',
            'image'          => 'nullable|image|max:2048',
            'permissions'    => 'nullable',
        ]);

        $isSuperAdmin = $authUser->isSuperAdmin();

        $targetRole = null;
        if (!empty($validated['role_id'])) {
            $targetRole = Role::find($validated['role_id']);
        }
        if (!$targetRole && !empty($validated['role'])) {
            $rawRole = trim($validated['role']);
            $targetRole = Role::where('name', $rawRole)->orWhere('name', strtolower($rawRole))->first()
                       ?? Role::firstOrCreate(['name' => strtolower($rawRole)]);
        }
        if (!$targetRole) {
            $targetRole = Role::firstOrCreate(['name' => 'staff']);
        }

        // Non-superadmins cannot create superadmin accounts
        if (!$isSuperAdmin && in_array(strtolower($targetRole->name), ['super_admin', 'superadmin', 'sysad'])) {
            return response()->json(['message' => 'Unauthorized to assign administrative roles.'], 403);
        }

        $permissions = $request->input('permissions');
        if (is_string($permissions)) {
            $permissions = json_decode($permissions, true) ?? [];
        }

        // Inherit permissions configured for this role if not explicitly provided
        if (empty($permissions) && $targetRole) {
            $sampleUser = User::where('role_id', $targetRole->id)->whereNotNull('permissions')->first();
            if ($sampleUser && !empty($sampleUser->permissions)) {
                $permissions = $sampleUser->permissions;
            }
        }

        $targetEmail = trim($validated['email_address'] ?? $validated['email']);

        $computedName = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));
        if (empty($computedName)) {
            $computedName = !empty($validated['name']) ? trim($validated['name']) : 'Pending Activation';
        }

        // Auto-generate temporary password: 4 random chars + 4 random digits
        $plainPassword = Str::random(4) . rand(1000, 9999);
        $inviteToken = Str::random(40);

        $avatarPath = null;
        if ($request->hasFile('image')) {
            $avatarPath = app(\App\Services\MediaUploadService::class)->upload($request->file('image'), 'avatars');
        } elseif (!empty($validated['avatar'])) {
            $avatarPath = app(\App\Services\MediaUploadService::class)->upload($validated['avatar'], 'avatars');
        }

        $user = User::create([
            'first_name'     => $validated['first_name'] ?? null,
            'middle_name'    => $validated['middle_name'] ?? null,
            'last_name'      => $validated['last_name'] ?? null,
            'suffix'         => $validated['suffix'] ?? null,
            'name'           => $computedName,
            'email_address'  => $targetEmail,
            'email'          => $targetEmail,
            'password'       => Hash::make($plainPassword),
            'role_id'        => $targetRole->id,
            'location'       => $validated['location'] ?? null,
            'avatar'         => $avatarPath ? Storage::url($avatarPath) : null,
            'permissions'    => $permissions,
            'invite_token'   => $inviteToken,
            'invited_at'     => now(),
            'status'         => 'pending_activation',
            'is_active'      => true,
            'created_by'     => auth()->id(),
        ]);

        $user->load(['role']);

        // Log to Audit Log
        $this->auditLog->log(
            $authUser,
            'USER_CREATED',
            'users',
            $user->id,
            ['email' => $targetEmail, 'role' => $targetRole->name]
        );

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

        // Non-superadmin authorization checks:
        if (!$isSuperAdmin) {
            if ($targetUser->isSuperAdmin()) {
                return response()->json(['message' => 'Unauthorized to modify administrative accounts.'], 403);
            }
        }

        $validated = $request->validate([
            'name'           => 'nullable|string|max:255',
            'first_name'     => 'nullable|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'nullable|string|max:255',
            'suffix'         => 'nullable|string|max:50',
            'email_address'  => ['nullable', 'email', 'max:255', Rule::unique('users', 'email_address')->ignore($targetUser->id), new ActiveDeliverableEmail],
            'email'          => ['nullable', 'email', 'max:255', new ActiveDeliverableEmail],
            'role'           => 'nullable|string',
            'status'         => 'nullable|string',
            'is_active'      => 'nullable',
            'location'       => 'nullable|string|max:255',
            'new_password'   => 'nullable|string|min:6',
            'permissions'    => 'nullable',
        ]);

        if (array_key_exists('first_name', $validated)) $targetUser->first_name = $validated['first_name'];
        if (array_key_exists('middle_name', $validated)) $targetUser->middle_name = $validated['middle_name'];
        if (array_key_exists('last_name', $validated)) $targetUser->last_name = $validated['last_name'];
        if (array_key_exists('suffix', $validated)) $targetUser->suffix = $validated['suffix'];

        if (array_key_exists('name', $validated)) {
            $nameVal = trim((string)$validated['name']);
            if ($nameVal !== '') {
                $targetUser->name = $nameVal;
            }
        }

        $newEmail = trim($validated['email_address'] ?? $validated['email'] ?? '');
        if (!empty($newEmail)) {
            $targetUser->email_address = $newEmail;
            $targetUser->email = $newEmail;
        }

        if (isset($validated['status'])) $targetUser->status = $validated['status'];
        if (isset($validated['is_active'])) $targetUser->is_active = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

        if (!empty($validated['role_id'])) {
            $r = Role::find($validated['role_id']);
            if ($r && ($isSuperAdmin || !in_array(strtolower($r->name), ['super_admin', 'superadmin', 'sysad']))) {
                $targetUser->role_id = $r->id;
            }
        } elseif (!empty($validated['role'])) {
            $rawRole = trim($validated['role']);
            $r = Role::where('name', $rawRole)->orWhere('name', strtolower($rawRole))->first()
              ?? Role::firstOrCreate(['name' => strtolower($rawRole)]);
            if ($r && ($isSuperAdmin || !in_array(strtolower($r->name), ['super_admin', 'superadmin', 'sysad']))) {
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

        // Log to Audit Log
        $this->auditLog->log(
            $authUser,
            'USER_UPDATED',
            'users',
            $targetUser->id,
            ['name' => $targetUser->name, 'email' => $targetUser->email_address ?? $targetUser->email, 'role' => $targetUser->role?->name]
        );

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $targetUser->load(['role']),
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

        if ($authUser && $authUser->id === $targetUser->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        if (!$isSuperAdmin && $targetUser->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized to delete administrative accounts.'], 403);
        }

        $targetUser->delete();

        // Log to Audit Log
        $this->auditLog->log(
            $authUser,
            'USER_ARCHIVED',
            'users',
            $targetUser->id,
            ['name' => $targetUser->name, 'email' => $targetUser->email_address ?? $targetUser->email]
        );

        return response()->json(['message' => 'User archived (soft-deleted) successfully']);
    }

    /**
     * Resend account activation invitation email.
     */
    public function resendInvite(Request $request, int $id): JsonResponse
    {
        $targetUser = User::findOrFail($id);

        if (!$targetUser->invite_token) {
            $targetUser->invite_token = Str::random(40);
        }
        $targetUser->invited_at         = now();
        $targetUser->email_verified_at  = null;  // must re-verify via new activation link
        $targetUser->status             = 'pending_activation';
        $targetUser->save();

        $plainPassword = Str::random(4) . rand(1000, 9999);

        try {
            SendNewUserCredentialsJob::dispatch($targetUser, $plainPassword);
        } catch (\Throwable $e) {
            // Silently log or handle if mail driver fails
        }

        $destEmail = $targetUser->email_address ?: $targetUser->email;

        return response()->json([
            'message' => 'Invitation email resent successfully to ' . $destEmail,
            'user'    => $targetUser,
        ]);
    }
}
