<?php

namespace App\Exceptions;

use Exception;

class BookingActionNotAllowedException extends Exception
{
    protected $message = 'You are not allowed to perform this action on this booking at this time.';
}