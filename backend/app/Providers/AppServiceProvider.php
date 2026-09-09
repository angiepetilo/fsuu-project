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
    }

}
