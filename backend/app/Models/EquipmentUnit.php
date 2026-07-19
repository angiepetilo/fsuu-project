<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_type_id',
        'barcode',
        'condition_status',
        'is_available',
    ];

    public function equipmentType()
    {
        return $this->belongsTo(EquipmentType::class);
    }

    public function borrowingUnit()
    {
        return $this->hasOne(EquipmentBorrowingUnit::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    public function scopeGoodCondition($query)
    {
        return $query->where('condition_status', 'good');
    }
}