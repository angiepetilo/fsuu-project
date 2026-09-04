<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeMatrix extends Model
{
    protected $table = 'fee_matrices';

    protected $fillable = [
        'venue_id',
        'title',
        'show_signatures',
        'show_rate_items',
        'notes_enabled',
        'notes',
        'signatories',
        'rate_items',
    ];

    protected $casts = [
        'show_signatures' => 'boolean',
        'show_rate_items' => 'boolean',
        'notes_enabled'   => 'boolean',
        'signatories'     => 'array',
        'rate_items'      => 'array',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }
}
