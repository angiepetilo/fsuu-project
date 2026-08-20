<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrackingNumber extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    /**
     * Note: reference_code, status, approved_by, and rejected_by are excluded from $fillable.
     */
    protected $fillable = [
        'reservation_type',
        'reservation_id',
    ];

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function reservation()
    {
        if ($this->reservation_type === 'venue_booking') {
            return $this->belongsTo(VenueBooking::class, 'reservation_id');
        } elseif ($this->reservation_type === 'equipment_borrow') {
            return $this->belongsTo(EquipmentBorrow::class, 'reservation_id');
        }
        return null;
    }
}
