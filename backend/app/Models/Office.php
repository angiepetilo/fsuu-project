<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Office extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'location',
    ];

    protected static function booted(): void
    {
        static::creating(function (Office $office) {
            if (empty($office->slug)) {
                $base = $office->location
                    ? Str::slug("{$office->name} {$office->location}")
                    : Str::slug($office->name);

                if (empty($base)) {
                    $base = 'office';
                }

                $slug = $base;
                $count = 1;

                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$base}-{$count}";
                    $count++;
                }

                $office->slug = $slug;
            }
        });
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class);
    }

    public function equipmentTypes(): HasMany
    {
        return $this->hasMany(EquipmentType::class);
    }

    public function equipmentBorrows(): HasMany
    {
        return $this->hasMany(EquipmentBorrow::class);
    }
}
