<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class AvrVenueBooking extends VenueBooking
{
    protected $table = 'venue_bookings';

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'venue_booking_id');
    }
}
