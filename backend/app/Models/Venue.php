<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Venue extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'name',
        'avatar',
        'location',
        'capacity',
        'status',
        'allowed_equipment',
        'equipment_max_qtys',
    ];

    protected $casts = [
        'allowed_equipment' => 'array',
        'equipment_max_qtys' => 'array',
    ];

    public function venueBookings(): HasMany
    {
        return $this->hasMany(VenueBooking::class);
    }
}
