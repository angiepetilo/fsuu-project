<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookingRequirement extends Model
{
    use HasFactory, SoftDeletes;

    public const DELETED_AT = 'archived_at';

    protected $fillable = [
        'classification',
        'label',
        'description',
        'template_file_url',
        'template_file_name',
        'template_display_mode',
        'format_content',
        'sort_order',
    ];

    protected $casts = [
        'format_content' => 'array',
    ];
}
