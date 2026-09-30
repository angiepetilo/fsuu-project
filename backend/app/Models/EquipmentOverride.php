<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentOverride extends Model
{
    use HasFactory;

    protected $table = 'equipment_overrides';

    protected $fillable = [
        'override_date',
        'status',
        'start_time',
        'end_time',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'override_date' => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
