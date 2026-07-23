<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Jobs\SendNewUserCredentialsJob;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function __construct()
    {
        if (request()->user() && !request()->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }
    }

    /**
     * Display a listing of the users.
     */
    public function index()
    {
        return response()->json(User::with('office')->get());
    }

    /**
     * Store a newly created user.
     * Fields: name, email (login username), personal_email, role, image
     * Password is auto-generated (4 random chars + 4 random digits) and emailed to personal_email.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|string|max:255|unique:users',
            'personal_email' => 'required|email|max:255',
            'role'           => 'required|in:admin,staff',
            'office_id'      => 'nullable|exists:offices,id',
            'image'          => 'nullable|image|max:2048',
        ]);

        $avatarPath = null;
        if ($request->hasFile('image')) {
            $avatarPath = $request->file('image')->store('avatars', 'public');
        }

        // Generate password: 4 random chars + 4 random digits
        $plainPassword = Str::random(4) . rand(1000, 9999);

        $user = User::create([
            'name'           => $validated['name'],
            'email'          => $validated['email'],
            'personal_email' => $validated['personal_email'],
            'password'       => Hash::make($plainPassword),
            'role'           => $validated['role'],
            'office_id'      => $validated['office_id'] ?? null,
            'avatar'         => $avatarPath ? Storage::url($avatarPath) : null,
        ]);

        // Send credentials to the user's personal email
        SendNewUserCredentialsJob::dispatch($user, $plainPassword);

        return response()->json([
            'message' => 'User created successfully. Credentials sent to their personal email.',
            'user'    => $user,
        ], 201);
    }

    /**
     * Update the specified user.
     * Supports: name, email, personal_email, role, image, new_password
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'personal_email' => 'nullable|email|max:255',
            'role'           => 'required|in:admin,staff',
            'office_id'      => 'nullable|exists:offices,id',
            'image'          => 'nullable|image|max:2048',
            'remove_image'   => 'nullable|boolean',
            'new_password'   => 'nullable|string|min:6',
        ]);

        $user->name           = $validated['name'];
        $user->email          = $validated['email'];
        $user->personal_email = $validated['personal_email'] ?? $user->personal_email;
        $user->role           = $validated['role'];
        $user->office_id      = $validated['office_id'] ?? $user->office_id;

        // Change password if provided
        if (!empty($validated['new_password'])) {
            $user->password = Hash::make($validated['new_password']);
        }

        // Handle avatar
        if ($request->boolean('remove_image')) {
            if ($user->avatar) $this->deleteAvatarFile($user->avatar);
            $user->avatar = null;
        } elseif ($request->hasFile('image')) {
            if ($user->avatar) $this->deleteAvatarFile($user->avatar);
            $avatarPath   = $request->file('image')->store('avatars', 'public');
            $user->avatar = Storage::url($avatarPath);
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user,
        ]);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        if ($user->avatar) $this->deleteAvatarFile($user->avatar);

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    private function deleteAvatarFile($url)
    {
        if (Str::startsWith($url, '/storage/')) {
            $path = str_replace('/storage/', '', $url);
            Storage::disk('public')->delete($path);
        }
    }
}
