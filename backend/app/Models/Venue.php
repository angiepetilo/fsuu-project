<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Venue extends Model
{
    use HasFactory;

    protected $fillable = [
        'office_id',
        'name',
        'location',
        'capacity',
        'external_price',
        'is_active',
        'image_path',
    ];

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function equipmentTypes()
    {
        return $this->belongsToMany(EquipmentType::class, 'venue_equipment_types');
    }

    public function scopeForOffice($query, $officeId)
    {
        return $query->where('office_id', $officeId);
    }
}