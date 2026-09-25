<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Brand extends Model
{
    use HasFactory;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'equipment_type_id',
        'description',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['equipment_category_name'];

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class, 'equipment_type_id');
    }

    public function getEquipmentCategoryNameAttribute(): ?string
    {
        return $this->equipmentType?->eq_name ?? $this->equipmentType?->name;
    }

    public function equipmentUnits()
    {
        return $this->hasMany(EquipmentUnit::class, 'brand', 'name');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
