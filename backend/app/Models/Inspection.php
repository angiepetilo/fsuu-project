<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Inspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'inspectable_type',
        'inspectable_id',
        'reference_type',
        'reference_id',
        'inspected_by',
        'inspection_type',
        'condition',
        'violation_type',
        'notes',
        'evidence_photo',
        'assigned_units',
        'unit_conditions',
        'inspected_at',
    ];

    protected $casts = [
        'inspected_at'    => 'datetime',
        'assigned_units'  => 'array',
        'unit_conditions' => 'array',
    ];

    public function inspectable(): MorphTo
    {
        return $this->morphTo();
    }

    public function inspectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }
}
