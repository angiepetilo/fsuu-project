<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EntryVerification extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'avr_venue_booking_id',
        'contact_method_verified',
    ];

    public function avrVenueBooking()
    {
        return $this->belongsTo(AvrVenueBooking::class);
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}