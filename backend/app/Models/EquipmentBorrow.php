<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentBorrow extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    /**
     * Note: office_id is excluded from $fillable and assigned via trusted service code.
     */
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
    ];

    protected $casts = [
        'date_of_usage' => 'date',
    ];

    public function trackingNumber(): BelongsTo
    {
        return $this->belongsTo(TrackingNumber::class);
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(EquipmentBorrowItem::class);
    }
}
