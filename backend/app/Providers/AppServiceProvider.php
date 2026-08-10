<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\AvrVenueBooking;
use App\Policies\AvrVenueBooking\AvrVenueBookingPolicy;
use App\Models\EquipmentBorrowing;
use App\Policies\AvrEquipmentBorrowing\AvrEquipmentBorrowingPolicy;
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
        Gate::policy(AvrVenueBooking::class, AvrVenueBookingPolicy::class);
        Gate::policy(EquipmentBorrowing::class, AvrEquipmentBorrowingPolicy::class);

    }

}
