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

    protected $appends = ['serial_no'];

    public function setSerialNumberAttribute($value)
    {
        $val = !is_null($value) ? trim((string)$value) : null;
        $this->attributes['serial_number'] = $val;
        $this->attributes['barcode'] = $val;
    }

    public function setBarcodeAttribute($value)
    {
        $val = !is_null($value) ? trim((string)$value) : null;
        $this->attributes['barcode'] = $val;
        $this->attributes['serial_number'] = $val;
    }

    public function getSerialNumberAttribute($value)
    {
        return $value ?: ($this->attributes['barcode'] ?? null);
    }

    public function getBarcodeAttribute($value)
    {
        return $value ?: ($this->attributes['serial_number'] ?? null);
    }

    public function getSerialNoAttribute(): ?string
    {
        return $this->serial_number ?: ($this->barcode ?? null);
    }

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class);
    }
}
