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
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'email_address',
        'email',
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

    protected $appends = ['name', 'full_name', 'role_name', 'email', 'email_address'];

    public function getRoleNameAttribute(): string
    {
        return $this->role?->name ?? 'staff';
    }

    public function getEmailAddressAttribute(): string
    {
        return $this->attributes['email_address'] ?? $this->attributes['email'] ?? '';
    }

    public function setEmailAddressAttribute($value): void
    {
        $this->attributes['email_address'] = $value;
        $this->attributes['email'] = $value;
    }

    public function getEmailAttribute(): string
    {
        return $this->attributes['email_address'] ?? $this->attributes['email'] ?? '';
    }

    public function setEmailAttribute($value): void
    {
        $this->attributes['email'] = $value;
        $this->attributes['email_address'] = $value;
    }

    public function getFullNameAttribute(): string
    {
        $parts = array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->suffix,
        ]);
        if (!empty($parts)) {
            return implode(' ', $parts);
        }
        return $this->attributes['name'] ?? '';
    }

    public function getNameAttribute(): string
    {
        return $this->getFullNameAttribute();
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['first_name']) && !empty($value)) {
            $parts = explode(' ', trim($value));
            $this->attributes['first_name'] = array_shift($parts) ?: $value;
            $this->attributes['last_name'] = !empty($parts) ? implode(' ', $parts) : '';
        }
    }

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

    public function isStaff(): bool
    {
        if ($this->isSuperAdmin()) {
            return false;
        }
        $r = strtolower($this->role?->slug ?? $this->role?->name ?? '');
        return in_array($r, ['staff', 'admin', 'office_admin']) || $this->role_id === 2;
    }

    public function isStudentAssistant(): bool
    {
        if ($this->isSuperAdmin()) {
            return false;
        }
        $r = strtolower($this->role?->slug ?? $this->role?->name ?? '');
        return in_array($r, ['student_assistant', 'student-assistant', 'student assistant', 'sa']) || $this->role_id === 3;
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || $this->isStaff();
    }

    public function hasPermission($area = null, $action = null): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $areaStr = is_object($area) && isset($area->value) ? $area->value : (string)$area;
        $actionStr = is_object($action) && isset($action->value) ? $action->value : (string)$action;

        $perms = $this->permissions ?? [];
        if (empty($perms)) {
            // Default full access for staff, customized for student assistant
            return $this->isStaff();
        }

        if (is_array($perms)) {
            if (in_array('*', $perms) || in_array($areaStr, $perms)) {
                return true;
            }
            if ($actionStr && (in_array("{$areaStr}.{$actionStr}", $perms) || in_array("{$areaStr}:{$actionStr}", $perms))) {
                return true;
            }
        }

        return false;
    }
}
