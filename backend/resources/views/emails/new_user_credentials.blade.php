<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }
    .header { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 16px; border-bottom: 2px solid #eff6ff; padding-bottom: 12px; }
    .credentials-block { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px; line-height: 1.8; }
    .act-btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; }
    p { margin-bottom: 14px; }
    .signoff { margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
<div class="container">
@php
    $adminName = $user->name ?? 'Staff';
    $roleNameVal = is_object($user->role) ? ($user->role->name ?? 'Staff') : (string)($user->role ?? 'Staff');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $activationUrl = !empty($user->invite_token) ? $baseUrl . '/activate/' . $user->invite_token : $baseUrl . '/login';
@endphp

  <div class="header">
    Father Saturnino Urios University
  </div>

  <p>Good day <strong>{{ $adminName }}</strong>,</p>

  <p>An Administrator has invited you to access the <strong>FSUU Reserve and Booking System</strong>.</p>

  <div class="credentials-block">
    <strong>Account Email:</strong> {{ $user->email ?? $user->personal_email }}<br>
    <strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #1e40af;">{{ $password }}</code><br>
    <strong>Role:</strong> {{ ucfirst(str_replace('_', ' ', $roleNameVal)) }}
  </div>

  <p style="text-align: center; margin: 24px 0;">
    <a href="{{ $activationUrl }}" class="act-btn">Activate Your Account Now</a>
  </p>

  <p style="font-size: 12px; color: #64748b;">Or copy this link into your browser: <br><a href="{{ $activationUrl }}" style="color: #2563eb; word-break: break-all;">{{ $activationUrl }}</a></p>

  <p style="font-size: 12px; color: #64748b;"><strong>Security Notice:</strong> Please sign in and set your new permanent password. Do not share your login credentials with unauthorized personnel.</p>

  <p class="signoff">
    Respectfully,<br>
    <strong>System Administrator</strong><br>
    Father Saturnino Urios University, Butuan City
  </p>
</div>
</body>
</html>
