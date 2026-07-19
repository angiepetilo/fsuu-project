<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VenueEquipmentType extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'venue_id',
        'equipment_type_id',
    ];

    public function venue()
    {
        return $this->belongsTo(Venue::class);
    }

    public function equipmentType()
    {
        return $this->belongsTo(EquipmentType::class);
    }
}