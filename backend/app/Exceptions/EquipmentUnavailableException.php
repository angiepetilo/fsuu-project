<?php

namespace App\Exceptions;

use Exception;

class EquipmentUnavailableException extends Exception
{
    protected $message = 'One or more requested equipment types are not available in sufficient quantity for the selected dates.';
}