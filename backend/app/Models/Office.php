<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Office extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'type',
        'can_view_office_id',
    ];

    public function viewableOffice()
    {
        return $this->belongsTo(Office::class, 'can_view_office_id');
    }

    public function viewedByOffices()
    {
        return $this->hasMany(Office::class, 'can_view_office_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function venues()
    {
        return $this->hasMany(Venue::class);
    }

    public function equipmentTypes()
    {
        return $this->hasMany(EquipmentType::class);
    }

    public function isSco(): bool
    {
        return $this->type === 'sco';
    }

    public function isAvr(): bool
    {
        return $this->type === 'avr';
    }
}