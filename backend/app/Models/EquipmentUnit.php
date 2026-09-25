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

    protected $fillable = [
        'equipment_type_id',
        'brand',
        'model',
        'serial_number',
        'barcode',
        'purchased_at',
        'eq_lifespan',
        'status',
        'condition',
        'built_in_units',
        'built_in_models',
        'description',
    ];

    protected $casts = [
        'purchased_at'    => 'date',
        'eq_lifespan'     => 'integer',
        'built_in_units'  => 'array',
        'built_in_models' => 'array',
    ];

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class);
    }
}
