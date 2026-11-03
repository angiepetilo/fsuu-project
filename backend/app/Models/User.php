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
        'is_active'          => 'boolean',
        'password'           => 'hashed',
        'permissions'        => 'array',
        'invited_at'         => 'datetime',
        'email_verified_at'  => 'datetime',
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
            $this->attributes['first_name'] ?? null,
            $this->attributes['middle_name'] ?? null,
            $this->attributes['last_name'] ?? null,
            $this->attributes['suffix'] ?? null,
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
        if (!empty($value) && empty($this->attributes['first_name']) && empty($this->attributes['last_name'])) {
            $trimmed = trim($value);
            $parts = preg_split('/\s+/', $trimmed);
            if (count($parts) === 1) {
                $this->attributes['first_name'] = $parts[0];
            } elseif (count($parts) === 2) {
                $this->attributes['first_name'] = $parts[0];
                $this->attributes['last_name'] = $parts[1];
            } else {
                $this->attributes['first_name'] = array_shift($parts);
                $this->attributes['last_name'] = array_pop($parts);
                $this->attributes['middle_name'] = implode(' ', $parts);
            }
        }
    }

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            $parts = array_filter([
                $user->first_name,
                $user->middle_name,
                $user->last_name,
                $user->suffix,
            ]);
            if (!empty($parts)) {
                $user->attributes['name'] = implode(' ', $parts);
            }
            if (!empty($user->email_address) && empty($user->email)) {
                $user->email = $user->email_address;
            } elseif (!empty($user->email) && empty($user->email_address)) {
                $user->email_address = $user->email;
            }
        });
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
        $role = $this->relationLoaded('role') ? $this->role : null;
        if ($role) {
            $r = strtolower($role->slug ?? $role->name ?? '');
            return in_array($r, ['super_admin', 'super-admin', 'superadmin', 'super admin', 'sysad']);
        }
        return str_contains(strtolower($this->email ?? ''), 'superadmin');
    }

    public function isStaff(): bool
    {
        if ($this->role_id === 2) {
            return true;
        }
        if ($this->isSuperAdmin()) {
            return false;
        }
        $role = $this->relationLoaded('role') ? $this->role : null;
        if ($role) {
            $r = strtolower($role->slug ?? $role->name ?? '');
            return in_array($r, ['staff', 'admin', 'office_admin', 'general', 'general_operations']);
        }
        return false;
    }

    public function isStudentAssistant(): bool
    {
        if ($this->role_id === 3) {
            return true;
        }
        if ($this->isSuperAdmin()) {
            return false;
        }
        $role = $this->relationLoaded('role') ? $this->role : null;
        if ($role) {
            $r = strtolower($role->slug ?? $role->name ?? '');
            return in_array($r, ['student_assistant', 'student-assistant', 'student assistant', 'sa']);
        }
        return false;
    }

    public function isGeneral(): bool
    {
        return $this->isSuperAdmin() || $this->isStaff() || $this->isStudentAssistant();
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || $this->isStaff();
    }

    public function getPermissionsAttribute($value)
    {
        if (!is_null($value)) {
            $decoded = is_string($value) ? json_decode($value, true) : $value;
            if (is_array($decoded) && !empty($decoded)) {
                return $decoded;
            }
        }

        // Inherit directly from the assigned role if user permissions are empty/null
        if (!empty($this->role_id)) {
            $role = $this->relationLoaded('role') ? $this->role : Role::find($this->role_id);
            if ($role && !empty($role->permissions)) {
                $rolePerms = is_string($role->permissions) ? json_decode($role->permissions, true) : $role->permissions;
                if (is_array($rolePerms) && !empty($rolePerms)) {
                    return $rolePerms;
                }
            }
        }

        return is_array($value) ? $value : [];
    }

    public function hasPermission($area = null, $action = null): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $areaStr = is_object($area) && isset($area->value) ? $area->value : (string)$area;
        $actionStr = is_object($action) && isset($action->value) ? $action->value : (string)$action;

        // Support single string with dot notation: e.g. hasPermission('venue_bookings.approve')
        if (str_contains($areaStr, '.') && empty($actionStr)) {
            [$areaStr, $actionStr] = explode('.', $areaStr, 2);
        }

        // Normalize area aliases (e.g. venue_booking <=> venue_bookings)
        $areaAliases = [$areaStr];
        if (str_ends_with($areaStr, 's')) {
            $areaAliases[] = rtrim($areaStr, 's');
        } else {
            $areaAliases[] = $areaStr . 's';
        }
        if ($areaStr === 'venue_management') $areaAliases[] = 'manage_venues';
        if ($areaStr === 'manage_venues') $areaAliases[] = 'venue_management';
        if ($areaStr === 'equipment_management') $areaAliases[] = 'manage_equipments';
        if ($areaStr === 'manage_equipments') $areaAliases[] = 'equipment_management';

        $perms = $this->permissions ?? [];
        if (empty($perms) && !empty($this->role_id)) {
            $role = $this->relationLoaded('role') ? $this->role : Role::find($this->role_id);
            $perms = $role?->permissions ?? [];
            if (is_string($perms)) {
                $perms = json_decode($perms, true) ?: [];
            }
        }

        if (empty($perms)) {
            return false;
        }

        if (is_array($perms)) {
            if (in_array('*', $perms)) {
                return true;
            }

            // If action is specified, check granular action permission across all aliases
            if ($actionStr) {
                foreach ($areaAliases as $alias) {
                    if (in_array("{$alias}.{$actionStr}", $perms) || in_array("{$alias}:{$actionStr}", $perms)) {
                        return true;
                    }
                }
                // If the user has broad area permission without granular restrictions
                foreach ($areaAliases as $alias) {
                    if (in_array($alias, $perms)) {
                        $hasGranularForModule = false;
                        foreach ($perms as $p) {
                            if (str_starts_with($p, "{$alias}.")) {
                                $hasGranularForModule = true;
                                break;
                            }
                        }
                        if (!$hasGranularForModule) {
                            return true;
                        }
                    }
                }
                return false;
            }

            // If no action specified, check if user has access to area
            foreach ($areaAliases as $alias) {
                if (in_array($alias, $perms)) {
                    return true;
                }
                foreach ($perms as $p) {
                    if ($p === $alias || str_starts_with($p, "{$alias}.") || str_starts_with($p, "{$alias}:")) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
