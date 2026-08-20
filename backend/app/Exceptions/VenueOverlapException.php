<?php

namespace App\Exceptions;

use Exception;

class VenueOverlapException extends Exception
{
    protected $message = 'This venue is already booked for the selected date and time.';
}