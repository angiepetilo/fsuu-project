<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your New Account — FSUU Reserve and Booking System</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; color: #1e293b; }
        .wrapper { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #0f1c3f 0%, #1e3a8a 100%); padding: 40px 36px 36px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 0 0 6px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.65); font-size: 13px; margin: 0; }
        .body { padding: 36px; }
        .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .intro { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 28px; }
        .credentials-box { background: #f8faff; border: 1px solid #e0e7ff; border-radius: 14px; padding: 24px; margin-bottom: 28px; }
        .credentials-box h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin: 0 0 16px; }
        .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e8edf5; }
        .cred-row:last-child { border-bottom: none; }
        .cred-label { font-size: 12px; font-weight: 700; color: #64748b; }
        .cred-value { font-size: 14px; font-weight: 800; color: #0f172a; font-family: 'Courier New', monospace; background: #eff6ff; padding: 4px 10px; border-radius: 6px; }
        .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; margin: 0 auto 28px; }
        .warning { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; font-size: 12px; color: #92400e; line-height: 1.6; margin-bottom: 24px; }
        .footer { background: #f8faff; border-top: 1px solid #e8edf5; padding: 20px 36px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>🎓 FSUU Reserve &amp; Booking System</h1>
            <p>Father Saturnino Urios University, Butuan City</p>
        </div>

        <div class="body">
            <p class="greeting">Good day, {{ $user->name }}!</p>
            <p class="intro">
                An administrator has created a system account for you on the
                <strong>FSUU Reserve and Booking System</strong>. You can now sign in to access your dashboard and manage
                @if($user->role === 'admin') all system features as an Administrator. @else your assigned staff features. @endif
            </p>

            <div class="credentials-box">
                <h3>🔑 Your Login Credentials</h3>
                <div class="cred-row">
                    <span class="cred-label">Username / Email</span>
                    <span class="cred-value">{{ $user->email }}</span>
                </div>
                <div class="cred-row">
                    <span class="cred-label">Password</span>
                    <span class="cred-value">{{ $password }}</span>
                </div>
                <div class="cred-row">
                    <span class="cred-label">Role</span>
                    <span class="cred-value" style="text-transform: capitalize;">{{ $user->role }}</span>
                </div>
            </div>

            <a class="cta-btn" href="http://localhost:5173/login">Sign In to the System →</a>

            <div class="warning">
                ⚠️ <strong>Security Notice:</strong> For your security, please change your password immediately after your first login. Do not share your credentials with anyone.
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.7;">
                If you believe this account was created in error or you have any concerns, please contact your system administrator immediately.
            </p>
        </div>

        <div class="footer">
            <strong>Father Saturnino Urios University</strong><br>
            Butuan City, Agusan del Norte, Philippines<br>
            © {{ date('Y') }} FSUU Reserve and Booking System. All rights reserved.
        </div>
    </div>
</body>
</html>
