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
        'inspected_by',
        'inspection_type',
        'condition',
        'is_late',
        'timeliness',
        'minutes_late',
        'violation_type',
        'notes',
        'evidence_photo',
        'assigned_units',
        'unit_conditions',
        'inspected_at',
    ];

    protected $casts = [
        'is_late'         => 'boolean',
        'minutes_late'    => 'integer',
        'inspected_at'    => 'datetime',
        'assigned_units'  => 'array',
        'unit_conditions' => 'array',
    ];

    protected $appends = ['evidence_photos'];

    /**
     * Get all evidence photos as an array of URLs.
     */
    public function getEvidencePhotosAttribute(): array
    {
        $raw = $this->attributes['evidence_photo'] ?? null;
        if (empty($raw)) {
            return [];
        }
        if (is_array($raw)) {
            return array_values(array_filter($raw));
        }
        if (is_string($raw) && (str_starts_with(trim($raw), '[') || str_starts_with(trim($raw), '{'))) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded));
            }
        }
        return [$raw];
    }

    public function inspectable(): MorphTo
    {
        return $this->morphTo();
    }

    public function inspectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }
}
