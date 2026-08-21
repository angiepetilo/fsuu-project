<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OperatingHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_open',
        'venue_close',
        'equipment_open',
        'equipment_close',
        'arrival_grace_mins',
        'return_grace_mins',
        'auto_cancel_mins',
    ];

    protected $casts = [
        'arrival_grace_mins' => 'integer',
        'return_grace_mins'  => 'integer',
        'auto_cancel_mins'   => 'integer',
    ];
}
