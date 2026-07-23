<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'personal_email',
        'password',
        'office_id',
        'role',
        'google_id',
        'avatar',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    /** New staff_permissions relationship (area + action model). */
    public function staffPermissions()
    {
        return $this->hasMany(StaffPermission::class, 'staff_id');
    }

    /**
     * Legacy relationship — kept until permissions + user_permissions tables
     * are confirmed dropped. Do NOT use in new code.
     *
     * @deprecated Use staffPermissions() instead.
     */
    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions')
            ->withPivot('granted_by');
    }

    // ─── Role Helpers ─────────────────────────────────────────────────────────

    /**
     * New role model: 'admin' is the only privileged role.
     * Accepts legacy 'head' and 'super_admin' for backward compatibility
     * during seeder migration.
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'head', 'super_admin'], true);
    }

    /** @deprecated Use isAdmin() — kept for legacy Policy references during transition. */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /** @deprecated Use isAdmin() — kept for legacy Policy references during transition. */
    public function isHead(): bool
    {
        return $this->role === 'head';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    // ─── Permission Check ─────────────────────────────────────────────────────

    /**
     * Check if this user has a specific area + action permission.
     *
     * Admin (incl. legacy head/super_admin) → always true.
     * Staff → must have an explicit row in staff_permissions for this office/area/action.
     */
    public function hasPermission(PermissionArea|string $area, PermissionAction|string $action): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $areaValue   = $area   instanceof PermissionArea   ? $area->value   : $area;
        $actionValue = $action instanceof PermissionAction ? $action->value : $action;

        return $this->staffPermissions()
            ->where('area', $areaValue)
            ->where('action', $actionValue)
            ->exists();
    }
}
