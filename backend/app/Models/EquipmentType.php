<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentType extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'office_id',
        'eq_name',
        'eq_type',
        'barcode',
        'avatar',
        'total_quantity',
        'available_count',
        'date_purchased',
        'lifespan_years',
        'status',
        'description',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function equipmentUnits(): HasMany
    {
        return $this->hasMany(EquipmentUnit::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(EquipmentUnit::class);
    }

    public function scopeForOffice($query, ?int $officeId)
    {
        if ($officeId) {
            return $query->where('office_id', $officeId);
        }
        return $query;
    }
}
