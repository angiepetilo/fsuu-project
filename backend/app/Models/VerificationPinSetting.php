<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationPinSetting extends Model
{
    use HasFactory;

    protected $table = 'verification_pin_settings';

    protected $fillable = [
        'office_id',
        'master_pin',
        'is_enabled',
        'require_outside_hours',
        'require_multi_day_venue',
        'require_multi_day_equipment',
        'require_external',
        'pin_mode',
    ];

    protected $casts = [
        'is_enabled'                  => 'boolean',
        'require_outside_hours'       => 'boolean',
        'require_multi_day_venue'     => 'boolean',
        'require_multi_day_equipment' => 'boolean',
        'require_external'            => 'boolean',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }
}
