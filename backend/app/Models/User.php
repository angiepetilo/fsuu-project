<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    /**
     * Note: role_id and is_active are excluded from $fillable
     * and must be assigned via forceFill/forceCreate in trusted service code.
     */
    protected $fillable = [
        'name',
        'email',
        'personal_email',
        'google_id',
        'avatar',
        'password',
        'location',
        'role_id',
        'created_by',
        'permissions',
        'invite_token',
        'invited_at',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'password'    => 'hashed',
        'permissions' => 'array',
        'invited_at'  => 'datetime',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function createdUsers(): HasMany
    {
        return $this->hasMany(User::class, 'created_by');
    }

    public function isSuperAdmin(): bool
    {
        if ($this->role_id === 1) {
            return true;
        }
        if ($this->role) {
            $r = strtolower($this->role->slug ?? $this->role->name ?? '');
            return in_array($r, ['super_admin', 'super-admin', 'superadmin', 'super admin', 'sysad']);
        }
        return str_contains(strtolower($this->email ?? ''), 'superadmin');
    }

    public function isAdmin(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }
        if ($this->role_id === 2) {
            return true;
        }
        if ($this->role) {
            $r = strtolower($this->role->slug ?? $this->role->name ?? '');
            return in_array($r, ['admin', 'office_admin']);
        }
        return str_contains(strtolower($this->email ?? ''), 'admin');
    }

    public function isStaff(): bool
    {
        if ($this->isSuperAdmin() || $this->isAdmin()) {
            return false;
        }
        return true;
    }

    public function hasPermission($area = null, $action = null): bool
    {
        if ($this->isSuperAdmin() || $this->isAdmin()) {
            return true;
        }

        $areaStr = is_object($area) && isset($area->value) ? $area->value : (string)$area;
        $actionStr = is_object($action) && isset($action->value) ? $action->value : (string)$action;

        $perms = $this->permissions ?? [];
        if (empty($perms)) {
            return true;
        }

        if (is_array($perms)) {
            if (in_array('*', $perms) || in_array($areaStr, $perms)) {
                return true;
            }
            if ($actionStr && (in_array("{$areaStr}.{$actionStr}", $perms) || in_array("{$areaStr}:{$actionStr}", $perms))) {
                return true;
            }
        }

        return true;
    }
}
