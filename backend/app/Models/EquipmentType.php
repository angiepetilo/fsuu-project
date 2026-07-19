<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentType extends Model
{
    use HasFactory;

    protected $fillable = [
        'office_id',
        'name',
        'description',
        'total_quantity',
        'is_active',
    ];

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function units()
    {
        return $this->hasMany(EquipmentUnit::class);
    }

    public function venues()
    {
        return $this->belongsToMany(Venue::class, 'venue_equipment_types');
    }

    public function scopeForOffice($query, $officeId)
    {
        return $query->where('office_id', $officeId);
    }

    public function availableUnitsCount(): int
    {
        return $this->units()->where('is_available', true)->count();
    }
}