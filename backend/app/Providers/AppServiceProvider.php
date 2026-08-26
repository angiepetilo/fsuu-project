<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\VenueBooking;
use App\Policies\VenueBookingPolicy;
use App\Models\EquipmentBorrowing;
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
        Gate::policy(EquipmentBorrowing::class, EquipmentBorrowingPolicy::class);

        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'venue_booking' => \App\Models\VenueBooking::class,
            'equipment_borrow' => \App\Models\EquipmentBorrow::class,
            'App\Models\VenueBooking' => \App\Models\VenueBooking::class,
            'App\Models\EquipmentBorrow' => \App\Models\EquipmentBorrow::class,
        ]);

        \Illuminate\Support\Facades\Route::model('avrVenueBooking', \App\Models\VenueBooking::class);
        \Illuminate\Support\Facades\Route::model('venueBooking', \App\Models\VenueBooking::class);
        \Illuminate\Support\Facades\Route::model('equipmentBorrowing', \App\Models\EquipmentBorrowing::class);

        // ─── Application Firewall & Rate Limiters ─────────────────────────────
        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip())->response(function () {
                return response()->json([
                    'message' => 'Too many login attempts. Please wait 60 seconds before trying again.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('auth-activate', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($request->ip())->response(function () {
                return response()->json([
                    'message' => 'Too many account activation attempts. Please wait before trying again.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('otp', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip())->response(function () {
                return response()->json([
                    'message' => 'Too many OTP requests. Please wait 1 minute before requesting another code.'
                ], 429);
            });
        });

        \Illuminate\Support\Facades\RateLimiter::for('public-submissions', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($request->ip())->response(function () {
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
