<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentBorrowItem extends Model
{
    use HasFactory;

    /**
     * Note: equipment_unit_id is excluded from $fillable
     * as physical units are assigned only at pickup.
     */
    protected $fillable = [
        'equipment_borrow_id',
        'equipment_type_id',
        'quantity_requested',
        'picked_up_at',
        'returned_at',
    ];

    protected $casts = [
        'quantity_requested' => 'integer',
        'picked_up_at'       => 'datetime',
        'returned_at'        => 'datetime',
    ];

    public function equipmentBorrow(): BelongsTo
    {
        return $this->belongsTo(EquipmentBorrow::class);
    }

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class);
    }

    public function equipmentUnit(): BelongsTo
    {
        return $this->belongsTo(EquipmentUnit::class);
    }
}
