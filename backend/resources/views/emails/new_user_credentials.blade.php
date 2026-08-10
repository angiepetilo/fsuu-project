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
    $adminName = $user->name ?? 'Administrator';
    $usernameVal = $user->username ?? $user->email ?? 'Username';
    $officeNameVal = is_object($user->office) ? ($user->office->name ?? 'FSUU Main') : ($user->office_name ?? ($user->office ?? 'FSUU Main'));
    $roleNameVal = is_object($user->role) ? ($user->role->name ?? 'Staff') : (string)($user->role ?? 'Staff');
    $url = $loginUrl ?? 'http://localhost:5173/login';
@endphp

<p>Good day {{ $adminName }}</p>

<p>An Administrator has created a system account for you on the FSUU Reserve and Booking System.</p>

<p>Account Login Credentials :</p>

<div class="credentials-block">
Username : {{ $usernameVal }}<br>
Password : {{ $password }}<br>
Assigned Branch Office : {{ $officeNameVal }}<br>
Role : {{ ucfirst($roleNameVal) }}
</div>

<p>You may sign in to the system here : {{ $url }}</p>

<p>Security Notice: For security purposes, please log in and update your password upon your initial sign in. Do not share your login credentials with others</p>

<p>If you have any questions or require assistance, please contact the System Administrator.</p>

<p class="signoff">
Respectfully,<br>
System Administrator<br>
Father Saturnino Urios University, Butuan City
</p>
</body>
</html>
