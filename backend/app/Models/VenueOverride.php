<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueOverride extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'override_date',
        'status',
        'start_time',
        'end_time',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'override_date' => 'date:Y-m-d',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
