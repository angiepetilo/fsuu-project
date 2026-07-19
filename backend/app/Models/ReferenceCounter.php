<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferenceCounter extends Model
{
    protected $fillable = [
        'prefix',
        'year_month',
        'last_number',
    ];
}