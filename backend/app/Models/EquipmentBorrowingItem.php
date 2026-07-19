<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EquipmentBorrowingItem extends Model
{
    protected $fillable = [
        'equipment_borrowing_id',
        'equipment_type_id',
        'quantity_requested',
    ];

    public function equipmentBorrowing()
    {
        return $this->belongsTo(EquipmentBorrowing::class);
    }

    public function equipmentType()
    {
        return $this->belongsTo(EquipmentType::class);
    }

    public function units()
    {
        return $this->hasMany(EquipmentBorrowingUnit::class);
    }

    public function scopeForOffice($query, $officeId)
    {
        return $query->whereHas('equipmentType', fn ($q) => $q->where('office_id', $officeId));
    }
}