<?php

namespace App\Models;

use App\Enums\PermissionArea;
use App\Enums\PermissionAction;
use Illuminate\Database\Eloquent\Model;

class StaffPermission extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'staff_id',
        'office_id',
        'area',
        'action',
        'granted_by',
    ];

    protected function casts(): array
    {
        return [
            'area'       => PermissionArea::class,
            'action'     => PermissionAction::class,
            'created_at' => 'datetime',
        ];
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function grantedBy()
    {
        return $this->belongsTo(User::class, 'granted_by');
    }
}
