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

    'iprogsms' => [
        'api_key'     => env('IPROG_SMS_API_KEY'),
        'api_url'     => env('IPROG_SMS_API_URL', 'https://sms.iprogtech.com/api/v1/sms_messages'),
        'sender_name' => env('IPROG_SMS_SENDER_NAME'),
    ],

    'abstract' => [
        'email_validation_key' => env('ABSTRACT_EMAIL_API_KEY'),
        'api_url'              => env('ABSTRACT_EMAIL_API_URL', 'https://emailvalidation.abstractapi.com/v1/'),
    ],

];

