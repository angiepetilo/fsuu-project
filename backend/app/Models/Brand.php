<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    use HasFactory;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function equipmentUnits()
    {
        return $this->hasMany(EquipmentUnit::class, 'brand', 'name');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
