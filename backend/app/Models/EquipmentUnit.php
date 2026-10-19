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
        'seq_no',
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
        if (!isset($this->attributes['barcode']) || $this->attributes['barcode'] === null) {
            $this->attributes['barcode'] = $val;
        }
    }

    public function setBarcodeAttribute($value)
    {
        $val = !is_null($value) ? trim((string)$value) : null;
        $this->attributes['barcode'] = $val;
        if (!isset($this->attributes['serial_number']) || $this->attributes['serial_number'] === null) {
            $this->attributes['serial_number'] = $val;
        }
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

    /**
     * Given an array of unit codes (barcodes, serial numbers) or numeric IDs,
     * fetch all tied child accessory identifiers (IDs and barcodes) from built_in_units.
     *
     * @param array $codesOrIds
     * @return array{child_ids: int[], child_codes: string[], parents: \Illuminate\Database\Eloquent\Collection}
     */
    public static function resolveTiedChildAccessories(array $codesOrIds): array
    {
        if (empty($codesOrIds)) {
            return ['child_ids' => [], 'child_codes' => [], 'parents' => collect()];
        }

        $numericIds = array_values(array_filter($codesOrIds, fn($v) => is_numeric($v) && (int)$v > 0));
        $unitCodes = array_values(array_filter($codesOrIds, fn($v) => !empty($v)));

        $parents = static::where(function($q) use ($unitCodes, $numericIds) {
            $q->whereIn('barcode', $unitCodes)
              ->orWhereIn('serial_number', $unitCodes);
            if (!empty($numericIds)) {
                $q->orWhereIn('id', array_map('intval', $numericIds));
            }
        })
        ->whereNotNull('built_in_units')
        ->whereNull('archived_at')
        ->get();

        $childIds = [];
        $childCodes = [];

        foreach ($parents as $pu) {
            $built = is_string($pu->built_in_units) ? json_decode($pu->built_in_units, true) : $pu->built_in_units;
            if (is_array($built)) {
                foreach ($built as $cRef) {
                    if (is_numeric($cRef) && (int)$cRef > 0) {
                        $childIds[] = (int)$cRef;
                    }
                    if (!empty($cRef)) {
                        $childCodes[] = trim((string)$cRef);
                    }
                }
            }
        }

        return [
            'child_ids'   => array_values(array_unique($childIds)),
            'child_codes' => array_values(array_unique($childCodes)),
            'parents'     => $parents,
        ];
    }
}
