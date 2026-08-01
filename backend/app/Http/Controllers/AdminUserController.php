<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Jobs\SendNewUserCredentialsJob;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            User::with(['office', 'role'])->latest()->get()
        );
    }

    /**
     * Store a newly created user (Branch Admin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|max:255|unique:users,email',
            'username'       => 'nullable|string|max:255|unique:users,username',
            'personal_email' => 'nullable|email|max:255',
            'role'           => 'nullable|string',
            'office_id'      => 'nullable|exists:offices,id',
            'location'       => 'nullable|string|max:255',
            'image'          => 'nullable|image|max:2048',
        ]);

        // Resolve branch admin role
        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        // Username handle generation
        $username = !empty($validated['username'])
            ? Str::slug($validated['username'])
            : Str::slug(explode(' ', trim($validated['name']))[0] . rand(10, 99));

        // Auto-generate temporary password: 4 random chars + 4 random digits
        $plainPassword = Str::random(4) . rand(1000, 9999);

        $avatarPath = null;
        if ($request->hasFile('image')) {
            $avatarPath = $request->file('image')->store('avatars', 'public');
        }

        $user = User::create([
            'name'           => $validated['name'],
            'email'          => $validated['email'],
            'username'       => $username,
            'personal_email' => $validated['personal_email'] ?? $validated['email'],
            'password'       => Hash::make($plainPassword),
            'role_id'        => $adminRole->id,
            'office_id'      => $validated['office_id'] ?? null,
            'location'       => $validated['location'] ?? null,
            'avatar'         => $avatarPath ? Storage::url($avatarPath) : null,
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
            'message'        => 'Admin account created successfully. Credentials sent to institutional email.',
            'user'           => $user,
            'temp_password'  => $plainPassword,
        ], 201);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'email'          => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'username'       => ['sometimes', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'personal_email' => 'nullable|email|max:255',
            'office_id'      => 'nullable|exists:offices,id',
            'location'       => 'nullable|string|max:255',
            'new_password'   => 'nullable|string|min:6',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (isset($validated['username'])) $user->username = Str::slug($validated['username']);
        if (isset($validated['personal_email'])) $user->personal_email = $validated['personal_email'];
        if (array_key_exists('office_id', $validated)) $user->office_id = $validated['office_id'];
        if (array_key_exists('location', $validated)) $user->location = $validated['location'];

        if (!empty($validated['new_password'])) {
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user->load(['office', 'role']),
        ]);
    }

    /**
     * Soft-remove the specified user.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User archived (soft-deleted) successfully']);
    }
}
