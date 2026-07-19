<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScoStudioReservation extends Model
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

    public function approvals()
    {
        return $this->hasMany(Approval::class, 'reference_id')->where('reference_type', 'sco_studio_reservation');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'reference_id')->where('reference_type', 'sco_studio_reservation');
    }

    public function notificationLogs()
    {
        return $this->hasMany(NotificationLog::class, 'reference_id')->where('reference_type', 'sco_studio_reservation');
    }

    public function scopeForOffice($query, $officeId)
    {
        return $query->whereHas('venue', fn ($q) => $q->where('office_id', $officeId));
    }
}