<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VerificationPinSetting extends Model
{
    use HasFactory;

    protected $table = 'verification_pin_settings';

    protected $fillable = [
        'master_pin',
        'hashed_master_pin',
        'is_enabled',
        'require_outside_hours',
        'require_multi_day_venue',
        'require_multi_day_equipment',
        'require_external',
        'pin_mode',
        'venue_verify_email',
        'venue_verify_phone',
        'equipment_verify_email',
        'equipment_verify_phone',
    ];

    protected $casts = [
        'is_enabled'                  => 'boolean',
        'require_outside_hours'       => 'boolean',
        'require_multi_day_venue'     => 'boolean',
        'require_multi_day_equipment' => 'boolean',
        'require_external'            => 'boolean',
        'venue_verify_email'          => 'boolean',
        'venue_verify_phone'          => 'boolean',
        'equipment_verify_email'      => 'boolean',
        'equipment_verify_phone'      => 'boolean',
    ];
}
