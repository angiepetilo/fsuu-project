<?php

namespace App\Exceptions;

use Exception;

class StudioReservationTooSoonException extends Exception
{
    protected $message = 'Studio reservations must be submitted at least 3 days in advance.';
}