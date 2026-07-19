<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AvrVenueBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'requestor_name',
        'requestor_email',
        'requestor_contact_number',
        'requestor_program_office',
        'requestor_identity_type',
        'booking_classification',
        'purpose',
        'number_of_persons',
        'title_of_reservation',
        'event_type',
        'equipment_notes',
        'contact_preference',
        'start_datetime',
        'end_datetime',
    ];

    protected function casts(): array
    {
        return [
            'start_datetime' => 'datetime',
            'end_datetime' => 'datetime',
        ];
    }

    public function venue()
    {
        return $this->belongsTo(Venue::class);
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function equipmentBorrowings()
    {
        return $this->hasMany(EquipmentBorrowing::class);
    }

    public function entryVerification()
    {
        return $this->hasOne(EntryVerification::class);
    }

    // Polymorphic-style relationships via manual type-flag (not morphMany)
    public function approvals()
    {
        return $this->hasMany(Approval::class, 'reference_id')
            ->where('reference_type', 'avr_venue_booking');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'reference_id')
            ->where('reference_type', 'avr_venue_booking');
    }

    public function notificationLogs()
    {
        return $this->hasMany(NotificationLog::class, 'reference_id')
            ->where('reference_type', 'avr_venue_booking');
    }

    public function inspections()
    {
        return $this->hasMany(Inspection::class, 'reference_id')
            ->where('reference_type', 'avr_venue_booking');
    }

    public function scopeForOffice($query, $officeId)
    {
        return $query->whereHas('venue', fn ($q) => $q->where('office_id', $officeId));
    }
}