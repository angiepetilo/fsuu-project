<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Account Credentials - FSUU Reserve and Booking System</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; padding: 20px; max-width: 600px; margin: 0 auto;">

    <p>Good day {{ $user->name }},</p>

    <p>An administrator has created a system account for you on the FSUU Reserve and Booking System.</p>

    <p><strong>Your Account Login Credentials:</strong></p>
    <p style="margin-left: 15px;">
        <strong>Username Handle:</strong> {{ $user->username ?? Str::slug(explode(' ', trim($user->name))[0]) }}<br>
        <strong>Institutional Email:</strong> {{ $user->email }}<br>
        <strong>Password:</strong> {{ $password }}<br>
        <strong>Role:</strong> {{ is_object($user->role) ? ($user->role->name ?? 'Branch Admin') : (string)$user->role }}<br>
        @if($user->location)
        <strong>Campus Location:</strong> {{ $user->location }}<br>
        @endif
        @if($user->office)
        <strong>Assigned Branch Office:</strong> {{ $user->office->name }}<br>
        @endif
    </p>

    <p>You may sign in to the system here: <a href="http://localhost:5173/login">http://localhost:5173/login</a></p>

    <p>Security Notice: For security purposes, please log in and update your password upon your initial sign in. Do not share your login credentials with others.</p>

    <p>If you have any questions or require assistance, please contact the System Administrator.</p>

    <br>
    <p>
        Respectfully,<br>
        <strong>System Administrator</strong><br>
        Father Saturnino Urios University, Butuan City
    </p>

</body>
</html>
