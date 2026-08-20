<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicTerm extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'academic_year',
        'semester',
        'start_date',
        'end_date',
        'is_active',
        'total_venue_bookings',
        'total_equipment_borrowings',
        'total_breaches',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'is_active'                  => 'boolean',
        'start_date'                 => 'date:Y-m-d',
        'end_date'                   => 'date:Y-m-d',
        'closed_at'                  => 'datetime',
        'total_venue_bookings'       => 'integer',
        'total_equipment_borrowings' => 'integer',
        'total_breaches'             => 'integer',
    ];

    public function venueBookings(): HasMany
    {
        return $this->hasMany(VenueBooking::class, 'academic_term_id');
    }

    public function equipmentBorrowings(): HasMany
    {
        return $this->hasMany(EquipmentBorrowing::class, 'academic_term_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * Scope to get the currently active academic term.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
