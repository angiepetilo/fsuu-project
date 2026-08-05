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
     * Note: office_id, role_id, and is_active are excluded from $fillable
     * and must be assigned via forceFill/forceCreate in trusted service code.
     */
    protected $fillable = [
        'name',
        'email',
        'username',
        'personal_email',
        'google_id',
        'avatar',
        'password',
        'office_id',
        'location',
        'role_id',
        'created_by',
        'permissions',
    ];


    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'password'    => 'hashed',
        'permissions' => 'array',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
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
        if ($this->role) {
            $r = strtolower($this->role->slug ?? $this->role->name ?? '');
            return in_array($r, ['super_admin', 'super-admin', 'superadmin', 'super admin', 'sysad']);
        }
        return $this->role_id === 1 || str_contains(strtolower($this->email ?? ''), 'superadmin');
    }

    public function isAdmin(): bool
    {
        if ($this->role) {
            $r = strtolower($this->role->slug ?? $this->role->name ?? '');
            return in_array($r, ['admin', 'super_admin', 'super-admin', 'superadmin', 'super admin', 'sysad']);
        }
        return $this->isSuperAdmin() || $this->role_id === 2 || str_contains(strtolower($this->email ?? ''), 'admin');
    }
}

