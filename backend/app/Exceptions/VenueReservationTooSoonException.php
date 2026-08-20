<?php

namespace App\Exceptions;

use Exception;

class VenueReservationTooSoonException extends Exception
{
    public function __construct(string $message = 'Venue bookings must be made at least 3 days in advance.')
    {
        parent::__construct($message);
    }
}
