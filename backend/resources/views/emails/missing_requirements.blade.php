<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .header { background-color: #f8fafc; padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center; }
        .content { padding: 20px 0; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
        .tracking { font-weight: bold; color: #2563eb; font-size: 1.1em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Action Required: Missing Requirements</h2>
        </div>
        <div class="content">
            <p>Dear {{ $bookingDetails['requestor'] ?? 'Student/Staff' }},</p>
            
            <p>Your {{ $type }} booking request (Tracking No: <span class="tracking">{{ $bookingDetails['tracking_number'] ?? 'N/A' }}</span>) is currently pending.</p>
            
            <p><strong>Please see the office to compile and submit your missing requirements.</strong></p>
            
            <p>Your booking will not proceed to the approval stage until these requirements are fulfilled.</p>
            
            <p>Thank you,<br>FSUU Admin Office</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Father Saturnino Urios University. All rights reserved.
        </div>
    </div>
</body>
</html>
