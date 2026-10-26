<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentBorrow extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'academic_term_id',
        'tracking_number_id',
        'submission_channel',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'filer_name',
        'email_address',
        'department_id',
        'program_office',
        'contact_number',
        'classification',
        'place_of_use',
        'purpose',
        'date_of_usage',
        'extend_of_date_returned',
        'time_start',
        'time_end',
        'assigned_units',
        'equipment_units_id',
        'status',
        'rejection_reason',
        'returned_at',
        'restricted_equipment',
        'unit_conditions',  // virtual: populated from inspection payload for Email 4 receipt
    ];

    protected $casts = [
        'date_of_usage'           => 'date:Y-m-d',
        'extend_of_date_returned' => 'date:Y-m-d',
        'assigned_units'          => 'array',
        'restricted_equipment'    => 'array',
        'returned_at'             => 'datetime',
    ];

    protected $appends = ['reference_code', 'status', 'filer_name', 'is_email_verified', 'is_phone_verified', 'rejection_reason'];

    public function getRejectionReasonAttribute(): ?string
    {
        if (!empty($this->attributes['rejection_reason'])) {
            return $this->attributes['rejection_reason'];
        }
        if (!empty($this->attributes['notes']) && in_array(strtolower($this->status ?? ''), ['rejected', 'cancelled'])) {
            return $this->attributes['notes'];
        }
        try {
            $lastApproval = \Illuminate\Support\Facades\DB::table('approvals')
                ->where(function ($q) {
                    $q->where('reference_type', 'equipment_borrow')
                      ->orWhere('reference_type', 'equipment_borrowing')
                      ->orWhere('reference_type', 'avr_equipment_borrowing');
                })
                ->where('reference_id', $this->id)
                ->whereIn('action', ['rejected', 'cancelled'])
                ->latest('id')
                ->value('remarks');
            if (!empty($lastApproval)) {
                return $lastApproval;
            }
        } catch (\Throwable $t) {}

        return null;
    }

    public function getIsPhoneVerifiedAttribute(): bool
    {
        if (empty($this->contact_number)) {
            return false;
        }
        $clean = \App\Models\PhoneVerification::normalizePhoneNumber($this->contact_number);
        $record = \App\Models\PhoneVerification::where('phone_number', $clean)
            ->whereNotNull('verified_at')
            ->exists();
        if ($record) {
            return true;
        }
        // Online self-service equipment loans require verified contact number
        return in_array($this->submission_channel, ['online_self', 'online', null], true);
    }

    public function getIsEmailVerifiedAttribute(): bool
    {
        if (empty($this->email_address)) {
            return false;
        }
        return \App\Models\EmailVerification::where('email', strtolower(trim($this->email_address)))
            ->whereNotNull('verified_at')
            ->exists();
    }

    public function getRequestorEmailAttribute(): ?string
    {
        return $this->attributes['email_address'] 
            ?? $this->attributes['requestor_email'] 
            ?? $this->attributes['email'] 
            ?? null;
    }

    public function getEmailAttribute(): ?string
    {
        return $this->attributes['email_address'] 
            ?? $this->attributes['requestor_email'] 
            ?? $this->attributes['email'] 
            ?? null;
    }

    public function getReferenceCodeAttribute(): ?string
    {
        return $this->trackingNumber?->reference_code;
    }

    public function getStatusAttribute(): string
    {
        return $this->attributes['status'] ?? $this->trackingNumber?->status ?? 'pending';
    }

    public function getFilerNameAttribute(): string
    {
        $parts = array_filter([
            $this->attributes['first_name'] ?? null,
            $this->attributes['middle_name'] ?? null,
            $this->attributes['last_name'] ?? null,
            $this->attributes['suffix'] ?? null,
        ]);
        if (!empty($parts)) {
            return implode(' ', $parts);
        }
        return $this->attributes['filer_name'] ?? '';
    }

    public function setFilerNameAttribute($value): void
    {
        $this->attributes['filer_name'] = $value;
        if (!empty($value) && empty($this->attributes['first_name']) && empty($this->attributes['last_name'])) {
            $parts = preg_split('/\s+/', trim($value));
            if (count($parts) === 1) {
                $this->attributes['first_name'] = $parts[0];
            } elseif (count($parts) === 2) {
                $this->attributes['first_name'] = $parts[0];
                $this->attributes['last_name'] = $parts[1];
            } else {
                $this->attributes['first_name'] = array_shift($parts);
                $this->attributes['last_name'] = array_pop($parts);
                $this->attributes['middle_name'] = implode(' ', $parts);
            }
        }
    }

    protected static function booted(): void
    {
        static::saving(function (EquipmentBorrow $borrow) {
            $parts = array_filter([
                $borrow->first_name,
                $borrow->middle_name,
                $borrow->last_name,
                $borrow->suffix,
            ]);
            if (!empty($parts)) {
                $borrow->attributes['filer_name'] = implode(' ', $parts);
            }
        });
    }

    public function trackingNumber(): BelongsTo
    {
        return $this->belongsTo(TrackingNumber::class);
    }

    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(EquipmentBorrowItem::class, 'equipment_borrow_id');
    }

    public function inspections(): MorphMany
    {
        return $this->morphMany(Inspection::class, 'inspectable');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(Approval::class, 'reference_id')->where('reference_type', 'avr_equipment_borrow');
    }
}
