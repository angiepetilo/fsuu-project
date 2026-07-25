<?php

namespace App\Models;

use App\Enums\UnitStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_type_id',
        'barcode',
        'brand_model',
        'condition_status',
        'is_available',
        'unit_status',
        'unit_status_notes',
        'updated_by',
        'purchased_date',
        'lifespan_years',
        'image_path',
    ];

    protected function casts(): array
    {
        return [
            'unit_status' => UnitStatus::class,
        ];
    }

    public function equipmentType()
    {
        return $this->belongsTo(EquipmentType::class);
    }

    public function borrowingUnit()
    {
        return $this->hasOne(EquipmentBorrowingUnit::class);
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** Units that can be assigned to a borrowing request. */
    public function scopeAvailable($query)
    {
        return $query->where('unit_status', UnitStatus::Available);
    }

    /** True if this unit can be assigned right now. */
    public function isAvailableForBorrowing(): bool
    {
        return $this->unit_status === UnitStatus::Available;
    }
}