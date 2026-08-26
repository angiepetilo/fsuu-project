<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'brevo' => [
        'key' => env('BREVO_API_KEY', env('BREVO_KEY')),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        // The redirect URI must exactly match what is registered in Google Cloud Console.
        // For local dev: http://localhost:8000/api/auth/google/callback
        // For production: https://your-domain.com/api/auth/google/callback
        'redirect'      => env('GOOGLE_REDIRECT_URI') ?: (env('APP_ENV') === 'production' ? 'https://fsuu-booking-api.onrender.com/api/auth/google/callback' : 'http://localhost:8000/api/auth/google/callback'),
    ],

    'iprogsms' => [
        'api_key'     => env('IPROG_SMS_API_KEY'),
        'api_url'     => env('IPROG_SMS_API_URL', 'https://sms.iprogtech.com/api/v1/sms_messages'),
        'sender_name' => env('IPROG_SMS_SENDER_NAME'),
    ],

];
