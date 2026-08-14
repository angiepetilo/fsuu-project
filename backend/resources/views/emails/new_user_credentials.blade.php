<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #ffffff; margin: 0; padding: 20px; }
    p { margin-bottom: 16px; }
    .credentials-block { font-family: monospace; font-size: 13px; margin: 16px 0; }
    .signoff { margin-top: 24px; }
  </style>
</head>
<body>
@php
    $adminName = $user->name ?? 'User';
    $officeNameVal = is_object($user->office) ? ($user->office->name ?? 'FSUU Main') : ($user->office_name ?? ($user->office ?? 'FSUU Main'));
    $roleNameVal = is_object($user->role) ? ($user->role->name ?? 'Staff') : (string)($user->role ?? 'Staff');
    $baseUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
    $activationUrl = !empty($user->invite_token) ? $baseUrl . '/activate/' . $user->invite_token : $baseUrl . '/login';
@endphp

<p>Good day,</p>

<p>An Administrator has invited you to set up your account on the FSUU Reserve and Booking System.</p>

<div class="credentials-block">
Assigned Branch Office : {{ $officeNameVal }}<br>
Role : {{ ucfirst($roleNameVal) }}
</div>

<p>Please click the link below to activate your account and set up your Full Name and Password:</p>

<p><a href="{{ $activationUrl }}" style="display: inline-block; padding: 10px 18px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Activate Your Account</a></p>

<p>Or copy this link to your browser: {{ $activationUrl }}</p>

<p>Security Notice: For security purposes, please log in and update your password upon your initial sign in. Do not share your login credentials with others</p>

<p>If you have any questions or require assistance, please contact the System Administrator.</p>

<p class="signoff">
Respectfully,<br>
System Administrator<br>
Father Saturnino Urios University, Butuan City
</p>
</body>
</html>
