<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VenueBooking extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'tracking_number_id',
        'venue_id',
        'submission_channel',
        'filer_name',
        'email_address',
        'program_office',
        'contact_number',
        'classification',
        'place_of_use',
        'purpose',
        'status',
        'equipment_notes',
        'no_of_person',
        'date_of_usage',
        'reservation_end_date',
        'time_start',
        'time_end',
        'agreed_to_policy',
        'assigned_units',
        'endorsement_url',
        'endorsement_letter',
    ];

    protected $casts = [
        'agreed_to_policy' => 'boolean',
        'no_of_person'     => 'integer',
        'date_of_usage'    => 'date',
        'assigned_units'   => 'array',
    ];

    protected $appends = ['reference_code', 'status', 'endorsement_url'];

    public function getReferenceCodeAttribute(): ?string
    {
        return $this->trackingNumber?->reference_code;
    }

    public function getStatusAttribute(): string
    {
        return $this->attributes['status'] ?? $this->trackingNumber?->status ?? 'pending';
    }

    public function getEndorsementUrlAttribute(): ?string
    {
        if (!empty($this->attributes['endorsement_url'])) {
            return $this->attributes['endorsement_url'];
        }
        if (!empty($this->attributes['endorsement_letter'])) {
            return $this->attributes['endorsement_letter'];
        }
        $doc = $this->documents->where('document_type', 'endorsement_letter')->last()
            ?? $this->documents->last();
        return $doc?->file_path;
    }

    public function trackingNumber(): BelongsTo
    {
        return $this->belongsTo(TrackingNumber::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'venue_booking_id');
    }

    public function venueBookingEquipment(): HasMany
    {
        return $this->hasMany(VenueBookingEquipment::class, 'venue_booking_id');
    }

    public function equipmentItems(): HasMany
    {
        return $this->hasMany(VenueBookingEquipment::class, 'venue_booking_id');
    }

    public function inspections(): MorphMany
    {
        return $this->morphMany(Inspection::class, 'inspectable');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(Approval::class, 'reference_id')->where('reference_type', 'avr_venue_booking');
    }
}
