<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueAvailabilityOverride extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'override_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'override_date' => 'date',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
