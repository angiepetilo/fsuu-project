<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentBorrowing extends Model
{
    use HasFactory;

    protected $fillable = [
        'avr_venue_booking_id',
        'requestor_name',
        'requestor_email',
        'requestor_contact_number',
        'requestor_program_office',
        'requestor_identity_type',
        'purpose',
        'place_of_use',
        'used_inside_campus',
        'contact_preference',
        'start_datetime',
        'end_datetime',
    ];

    protected function casts(): array
    {
        return [
            'start_datetime' => 'datetime',
            'end_datetime' => 'datetime',
            'used_inside_campus' => 'boolean',
        ];
    }

    public function avrVenueBooking()
    {
        return $this->belongsTo(AvrVenueBooking::class);
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function items()
    {
        return $this->hasMany(EquipmentBorrowingItem::class);
    }

    public function approvals()
    {
        return $this->hasMany(Approval::class, 'reference_id')
            ->where('reference_type', 'equipment_borrowing');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'reference_id')
            ->where('reference_type', 'equipment_borrowing');
    }

    public function notificationLogs()
    {
        return $this->hasMany(NotificationLog::class, 'reference_id')
            ->where('reference_type', 'equipment_borrowing');
    }

    public function inspections()
    {
        return $this->hasMany(Inspection::class, 'reference_id')
            ->where('reference_type', 'equipment_borrowing');
    }
}