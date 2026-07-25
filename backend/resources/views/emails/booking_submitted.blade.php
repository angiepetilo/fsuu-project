<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Request Submitted</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <h2 style="color: #0f172a; margin-top: 0;">Hello {{ $details['requestor'] }},</h2>
        
        <p style="font-size: 16px; line-height: 1.5;">
            Your request for <strong>{{ $type === 'venue' ? 'Venue Booking' : 'Equipment Borrowing' }}</strong> has been successfully submitted and is currently in our queue.
        </p>

        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your Tracking Number</p>
            <h3 style="margin: 10px 0 0; color: #2563eb; font-size: 24px; font-family: monospace;">{{ $details['tracking_number'] }}</h3>
        </div>

        <p style="font-size: 16px; line-height: 1.5;">
            Your request is currently <strong>Waiting for Staff Approval</strong>. We will notify you once an action has been taken on your request. You can also use the tracking number above to check your request status on the portal.
        </p>

        <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            Thank you,<br>
            <strong>FSUU AVR/SCO Administrator</strong>
        </p>
    </div>
</body>
</html>
