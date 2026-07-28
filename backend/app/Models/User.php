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
        'password',
        'created_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'password'  => 'hashed',
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
        return $this->role_id === 1 || $this->role?->slug === 'super_admin' || $this->role?->name === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || $this->role_id === 2 || $this->role?->slug === 'admin' || $this->role?->name === 'admin';
    }
}
