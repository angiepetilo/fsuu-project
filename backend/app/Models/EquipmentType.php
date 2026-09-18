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
        'brand',
        'avatar',
        'total_quantity',
        'available_count',
        'date_purchased',
        'lifespan_years',
        'status',
        'description',
        'built_in_units',
    ];

    protected $casts = [
        'built_in_units' => 'array',
    ];

    protected $appends = ['name', 'category', 'built_in_names'];

    public function equipmentUnits(): HasMany
    {
        return $this->hasMany(EquipmentUnit::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(EquipmentUnit::class);
    }

    public function getNameAttribute(): ?string
    {
        return $this->attributes['eq_name'] ?? null;
    }

    public function getCategoryAttribute(): ?string
    {
        return $this->attributes['eq_name'] ?? null;
    }

    public function getBuiltInNamesAttribute(): array
    {
        $raw = $this->built_in_units ?? ($this->attributes['built_in_units'] ?? []);
        if (is_string($raw)) {
            $raw = json_decode($raw, true) ?: [];
        }
        if (empty($raw) || !is_array($raw)) {
            return [];
        }

        static $categoryNameMap = null;
        if ($categoryNameMap === null) {
            try {
                $categoryNameMap = static::withTrashed()->pluck('eq_name', 'id')->toArray();
            } catch (\Throwable $e) {
                $categoryNameMap = [];
            }
        }

        $names = [];
        foreach ($raw as $val) {
            if (empty($val)) continue;
            if (is_string($val) && !is_numeric($val)) {
                $names[] = trim($val);
            } elseif (isset($categoryNameMap[$val])) {
                $names[] = $categoryNameMap[$val];
            } else {
                $names[] = (string)$val;
            }
        }

        return array_values(array_unique(array_filter($names)));
    }
}
