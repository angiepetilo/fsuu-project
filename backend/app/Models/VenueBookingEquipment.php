<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueBookingEquipment extends Model
{
    use HasFactory;

    protected $table = 'venue_booking_equipment';

    protected $fillable = [
        'venue_booking_id',
        'equipment_type_id',
        'others_specify',
    ];

    public function venueBooking(): BelongsTo
    {
        return $this->belongsTo(VenueBooking::class);
    }

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class);
    }
}
