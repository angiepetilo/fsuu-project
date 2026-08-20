<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Approval extends Model
{
    protected $fillable = [
        'reference_type',
        'reference_id',
        'action',
        'remarks',
        'approved_by',
    ];

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
