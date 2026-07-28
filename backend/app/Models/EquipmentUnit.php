<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentUnit extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    /**
     * Note: status is excluded from $fillable.
     */
    protected $fillable = [
        'equipment_type_id',
        'unit_code',
        'purchased_at',
        'eq_lifespan',
    ];

    protected $casts = [
        'purchased_at' => 'date',
        'eq_lifespan'   => 'integer',
    ];

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class);
    }
}
