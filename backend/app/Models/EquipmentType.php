<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentType extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
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

    public function equipmentUnits(): HasMany
    {
        return $this->hasMany(EquipmentUnit::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(EquipmentUnit::class);
    }
}
