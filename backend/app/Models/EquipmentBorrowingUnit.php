<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EquipmentBorrowingUnit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'equipment_borrowing_item_id',
    ];

    public function item()
    {
        return $this->belongsTo(EquipmentBorrowingItem::class, 'equipment_borrowing_item_id');
    }

    public function equipmentUnit()
    {
        return $this->belongsTo(EquipmentUnit::class);
    }
}