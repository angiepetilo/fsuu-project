<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookingRequirement extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'office_id',
        'classification',
        'label',
        'description',
        'sort_order',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }
}
