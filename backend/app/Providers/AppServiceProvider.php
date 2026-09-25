<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\VenueBooking;
use App\Policies\VenueBookingPolicy;
use App\Models\EquipmentBorrow;
use App\Policies\EquipmentBorrowingPolicy;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // ─── Custom Mail Drivers ─────────────────────────────────────────────
        \Illuminate\Support\Facades\Mail::extend('brevo', function (array $config = []) {
            $key = $config['key'] ?? config('services.brevo.key') ?? env('BREVO_API_KEY') ?? env('BREVO_KEY');
            return new \Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport((string) $key);
        });

        Gate::policy(VenueBooking::class, VenueBookingPolicy::class);
        Gate::policy(EquipmentBorrow::class, EquipmentBorrowingPolicy::class);

        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'venue_booking' => \App\Models\VenueBooking::class,
            'equipment_borrow' => \App\Models\EquipmentBorrow::class,
            'App\Models\VenueBooking' => \App\Models\VenueBooking::class,
            'App\Models\EquipmentBorrow' => \App\Models\EquipmentBorrow::class,
        ]);

        \Illuminate\Support\Facades\Route::model('avrVenueBooking', \App\Models\VenueBooking::class);
        \Illuminate\Support\Facades\Route::model('venueBooking', \App\Models\VenueBooking::class);
        \Illuminate\Support\Facades\Route::model('equipmentBorrowing', \App\Models\EquipmentBorrow::class);

        // ─── Application Firewall & Rate Limiters ─────────────────────────────
        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip())->response(function () use ($request) {
                try {
                    \App\Models\SecurityAlert::create([
                        'event_type' => 'login_lockout',
                        'severity' => 'high',
                        'title' => '1-Minute Login Lockout Triggered',
                        'description' => "Automated 60-second login lockout activated for IP {$request->ip()} after exceeding 5 login attempts per minute.",
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'metadata' => [
                            'endpoint' => $request->path(),
                            'attempted_email' => $request->input('email'),
                            'limit' => 5,
                            'duration' => '60 seconds',
                        ],
                        'status' => 'unresolved',
                    ]);
                } catch (\Throwable $e) {}

                return response()->json([
                    'message' => 'Too many login attempts. Please wait 60 seconds before trying again.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('auth-activate', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($request->ip())->response(function () use ($request) {
                try {
                    \App\Models\SecurityAlert::create([
                        'event_type' => 'rate_limit_breach',
                        'severity' => 'medium',
                        'title' => 'Account Activation Rate Limit Exceeded',
                        'description' => "Repeated activation attempts exceeded threshold (10/min) from IP {$request->ip()}.",
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'metadata' => ['endpoint' => $request->path()],
                        'status' => 'unresolved',
                    ]);
                } catch (\Throwable $e) {}

                return response()->json([
                    'message' => 'Too many account activation attempts. Please wait before trying again.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('otp', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip())->response(function () use ($request) {
                try {
                    \App\Models\SecurityAlert::create([
                        'event_type' => 'rate_limit_breach',
                        'severity' => 'medium',
                        'title' => 'OTP Verification Rate Limit Exceeded',
                        'description' => "Automated tracking: Too many OTP dispatch/verify requests from IP {$request->ip()}.",
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'metadata' => ['endpoint' => $request->path()],
                        'status' => 'unresolved',
                    ]);
                } catch (\Throwable $e) {}

                return response()->json([
                    'message' => 'Too many OTP requests. Please wait 1 minute before requesting another code.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('public-submissions', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($request->ip())->response(function () use ($request) {
                try {
                    \App\Models\SecurityAlert::create([
                        'event_type' => 'rate_limit_breach',
                        'severity' => 'low',
                        'title' => 'Public Submission Rate Limit Triggered',
                        'description' => "Excessive submission rate detected from IP {$request->ip()}.",
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'metadata' => ['endpoint' => $request->path()],
                        'status' => 'unresolved',
                    ]);
                } catch (\Throwable $e) {}

                return response()->json([
                    'message' => 'Submission rate limit exceeded. Please wait a moment before submitting another reservation.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('tracking', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(15)->by($request->ip())->response(function () {
                return response()->json([
                    'message' => 'Too many tracking requests. Please slow down.'
                ], 429);
            });
        });

        // ─── Automated Schema Self-Healing for Production Sync ─────────────────
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_types') && !\Illuminate\Support\Facades\Schema::hasColumn('equipment_types', 'built_in_units')) {
                \Illuminate\Support\Facades\Schema::table('equipment_types', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->json('built_in_units')->nullable();
                });
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_units') && !\Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'built_in_units')) {
                \Illuminate\Support\Facades\Schema::table('equipment_units', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->json('built_in_units')->nullable();
                });
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_units') && !\Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'serial_number')) {
                \Illuminate\Support\Facades\Schema::table('equipment_units', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('serial_number')->nullable()->after('model');
                });
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('email_verifications')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('email_verifications', 'channel')) {
                    \Illuminate\Support\Facades\Schema::table('email_verifications', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('channel', 20)->default('email');
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('email_verifications', 'phone_number')) {
                    \Illuminate\Support\Facades\Schema::table('email_verifications', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('phone_number', 50)->nullable();
                    });
                }
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_borrows')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'endorsement_url')) {
                    \Illuminate\Support\Facades\Schema::table('equipment_borrows', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('endorsement_url')->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('equipment_borrows', 'endorsement_letter')) {
                    \Illuminate\Support\Facades\Schema::table('equipment_borrows', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('endorsement_letter')->nullable();
                    });
                }
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('documents')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('documents', 'reservation_type')) {
                    \Illuminate\Support\Facades\Schema::table('documents', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('reservation_type')->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('documents', 'reservation_id')) {
                    \Illuminate\Support\Facades\Schema::table('documents', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->unsignedBigInteger('reservation_id')->nullable();
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('documents', 'equipment_borrow_id')) {
                    \Illuminate\Support\Facades\Schema::table('documents', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->unsignedBigInteger('equipment_borrow_id')->nullable();
                    });
                }
            }

            // Ensure default built-in category linkages exist for Projector if empty in Production
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_types') && \Illuminate\Support\Facades\Schema::hasColumn('equipment_types', 'built_in_units')) {
                $projectorType = \App\Models\EquipmentType::whereRaw("LOWER(eq_name) LIKE '%projector%'")->first();
                if ($projectorType && empty($projectorType->built_in_units)) {
                    $linkedIds = \App\Models\EquipmentType::where('id', '!=', $projectorType->id)
                        ->where(function($q) {
                            $q->whereRaw("LOWER(eq_name) LIKE '%camera%'")
                              ->orWhereRaw("LOWER(eq_name) LIKE '%hdmi%'")
                              ->orWhereRaw("LOWER(eq_name) LIKE '%microphone%'");
                        })
                        ->pluck('id')
                        ->toArray();
                    if (!empty($linkedIds)) {
                        $projectorType->update(['built_in_units' => $linkedIds]);
                    }
                }
            }

            // Ensure default physical unit built-in links exist for Projector units if empty in Production
            if (\Illuminate\Support\Facades\Schema::hasTable('equipment_units') && \Illuminate\Support\Facades\Schema::hasColumn('equipment_units', 'built_in_units')) {
                $projUnits = \App\Models\EquipmentUnit::whereNull('archived_at')
                    ->whereRaw("LOWER(model) LIKE '%projector%'")
                    ->get();
                foreach ($projUnits as $pu) {
                    if (empty($pu->built_in_units)) {
                        preg_match('/\d+/', $pu->model, $m);
                        $num = $m[0] ?? null;
                        if ($num) {
                            $childUnitIds = \App\Models\EquipmentUnit::whereNull('archived_at')
                                ->where('id', '!=', $pu->id)
                                ->where(function($q) use ($num) {
                                    $q->whereRaw("LOWER(model) LIKE ?", ["%camera - {$num}%"])
                                      ->orWhereRaw("LOWER(model) LIKE ?", ["%hdmi - {$num}%"])
                                      ->orWhereRaw("LOWER(model) LIKE ?", ["%microphone - {$num}%"])
                                      ->orWhereRaw("LOWER(model) LIKE ?", ["%camera%{$num}%"])
                                      ->orWhereRaw("LOWER(model) LIKE ?", ["%hdmi%{$num}%"])
                                      ->orWhereRaw("LOWER(model) LIKE ?", ["%microphone%{$num}%"]);
                                })
                                ->pluck('id')
                                ->map(fn($id) => (string)$id)
                                ->toArray();
                            if (!empty($childUnitIds)) {
                                $pu->update(['built_in_units' => $childUnitIds]);
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {}
    }

}
