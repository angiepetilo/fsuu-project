<?php

namespace App\Exceptions;

use Exception;

class ExternalRequiresVenueBookingException extends Exception
{
    protected $message = 'External users can only borrow equipment if they have an existing venue booking.';
}