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
        'auto_cancel_mins',
        'requirement_grace_hours',
    ];

    protected $casts = [
        'arrival_grace_mins'      => 'integer',
        'auto_cancel_mins'        => 'integer',
        'requirement_grace_hours' => 'integer',
    ];

    public static function getSettings(): self
    {
        $record = static::first();
        if (!$record) {
            $record = static::create([
                'venue_open'              => '07:30:00',
                'venue_close'             => '17:00:00',
                'equipment_open'          => '07:30:00',
                'equipment_close'         => '17:00:00',
                'arrival_grace_mins'      => 15,
                'auto_cancel_mins'        => 30,
                'requirement_grace_hours' => 24,
            ]);
        }
        return $record;
    }
}
