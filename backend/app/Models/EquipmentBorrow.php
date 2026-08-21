<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentBorrow extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'tracking_number_id',
        'submitted_by',
        'submission_channel',
        'filer_name',
        'email_address',
        'program_office',
        'contact_number',
        'classification',
        'place_of_use',
        'purpose',
        'date_of_usage',
        'time_start',
        'time_end',
        'school_id',
        'assigned_units',
    ];

    protected $casts = [
        'date_of_usage'  => 'date',
        'assigned_units' => 'array',
    ];

    protected $appends = ['reference_code', 'status'];

    public function getReferenceCodeAttribute(): ?string
    {
        return $this->trackingNumber?->reference_code;
    }

    public function getStatusAttribute(): string
    {
        return $this->attributes['status'] ?? $this->trackingNumber?->status ?? 'pending';
    }

    public function trackingNumber(): BelongsTo
    {
        return $this->belongsTo(TrackingNumber::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(EquipmentBorrowItem::class, 'equipment_borrow_id');
    }

    public function inspections(): MorphMany
    {
        return $this->morphMany(Inspection::class, 'inspectable');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(Approval::class, 'reference_id')->where('reference_type', 'avr_equipment_borrow');
    }
}
