<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    /**
     * Note: status is excluded from $fillable and updated by administrative workflows.
     */
    protected $fillable = [
        'venue_booking_id',
        'document_type',
        'file_path',
        'uploaded_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    public function venueBooking(): BelongsTo
    {
        return $this->belongsTo(VenueBooking::class);
    }
}
