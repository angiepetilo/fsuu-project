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
        'min_capacity',
        'max_capacity',
        'status',
        'allowed_equipment',
        'equipment_max_qtys',
    ];

    protected $casts = [
        'capacity'           => 'integer',
        'min_capacity'       => 'integer',
        'max_capacity'       => 'integer',
        'allowed_equipment'  => 'array',
        'equipment_max_qtys' => 'array',
    ];

    public function getMaxCapacityAttribute($val)
    {
        return $val ?? $this->attributes['capacity'] ?? 100;
    }

    public function getMinCapacityAttribute($val)
    {
        return $val ?? 1;
    }

    public function venueBookings(): HasMany
    {
        return $this->hasMany(VenueBooking::class);
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(VenueOverride::class);
    }
}
