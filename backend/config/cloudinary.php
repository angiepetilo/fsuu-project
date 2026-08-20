<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cloudinary Configuration
    |--------------------------------------------------------------------------
    |
    | An API key is required to make API calls to Cloudinary. The following
    | values should be provided in your environment file.
    |
    */

    'notification_url' => env('CLOUDINARY_NOTIFICATION_URL'),

    'cloud_url' => env('CLOUDINARY_URL'),

    'upload_preset' => env('CLOUDINARY_UPLOAD_PRESET'),

    'upload_route' => env('CLOUDINARY_UPLOAD_ROUTE'),

    'upload_action' => env('CLOUDINARY_UPLOAD_ACTION'),
];
