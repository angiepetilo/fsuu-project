<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperatingHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'office_id',
        'venue_open',
        'venue_close',
        'equipment_open',
        'equipment_close',
        'arrival_grace_mins',
        'return_grace_mins',
        'auto_cancel_mins',
    ];

    protected $casts = [
        'arrival_grace_mins' => 'integer',
        'return_grace_mins'  => 'integer',
        'auto_cancel_mins'   => 'integer',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }
}
