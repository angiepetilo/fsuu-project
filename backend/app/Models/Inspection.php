<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_type',
        'reference_id',
        'inspection_type',
        'condition_notes',
        'has_damage',
        'damage_charge_amount',
    ];

    protected function casts(): array
    {
        return [
            'has_damage' => 'boolean',
            'damage_charge_amount' => 'decimal:2',
        ];
    }

    public function inspectedBy()
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'reference_id')
            ->where('reference_type', 'inspection');
    }
}