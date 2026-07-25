<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Received — FSUU</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0f1c3f 0%, #1e3a8a 100%); padding: 40px 36px 36px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; margin: 0 0 6px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.65); font-size: 13px; margin: 0; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 50px; padding: 5px 14px; font-size: 12px; font-weight: 700; margin-top: 14px; letter-spacing: 0.5px; }
    .body { padding: 36px; }
    .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    .intro { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px; }
    .ref-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 18px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
    .ref-label { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
    .ref-code { font-size: 22px; font-weight: 900; color: #1d4ed8; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .details-box { background: #f8faff; border: 1px solid #e0e7ff; border-radius: 14px; padding: 24px; margin-bottom: 24px; }
    .details-box h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin: 0 0 16px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8edf5; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .row-label { color: #64748b; font-weight: 600; }
    .row-value { color: #0f172a; font-weight: 700; text-align: right; max-width: 60%; }
    .status-pill { display: inline-block; background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; border-radius: 50px; padding: 4px 14px; font-size: 12px; font-weight: 800; }
    .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; margin: 0 auto 24px; }
    .note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; font-size: 12px; color: #166534; line-height: 1.6; margin-bottom: 24px; }
    .footer { background: #f8faff; border-top: 1px solid #e8edf5; padding: 20px 36px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🎓 FSUU Reserve &amp; Booking System</h1>
    <p>Father Saturnino Urios University, Butuan City</p>
    <span class="badge">{{ $type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing' }}</span>
  </div>
  <div class="body">
    <p class="greeting">Good day, {{ $booking->requestor_name }}!</p>
    <p class="intro">
      Your {{ $type === 'venue' ? 'venue reservation request' : 'equipment borrowing request' }} has been
      <strong>successfully received</strong> by the FSUU Reserve and Booking System.
      Your reference code is shown below — please keep this for tracking purposes.
    </p>

    <div class="ref-box">
      <div>
        <div class="ref-label">Reference Code</div>
        <div class="ref-code">{{ $booking->reference_code }}</div>
      </div>
      <span class="status-pill">⏳ Pending Review</span>
    </div>

    <div class="details-box">
      <h3>📋 Booking Details</h3>
      @if($type === 'venue')
        <div class="row"><span class="row-label">Venue</span><span class="row-value">{{ $booking->venue->name ?? 'N/A' }}</span></div>
        <div class="row"><span class="row-label">Purpose</span><span class="row-value">{{ $booking->purpose }}</span></div>
        <div class="row"><span class="row-label">Start</span><span class="row-value">{{ \Carbon\Carbon::parse($booking->start_datetime)->timezone('Asia/Manila')->format('M d, Y h:i A') }}</span></div>
        <div class="row"><span class="row-label">End</span><span class="row-value">{{ \Carbon\Carbon::parse($booking->end_datetime)->timezone('Asia/Manila')->format('M d, Y h:i A') }}</span></div>
        <div class="row"><span class="row-label">Attendees</span><span class="row-value">{{ $booking->number_of_persons }}</span></div>
      @else
        <div class="row"><span class="row-label">Purpose</span><span class="row-value">{{ $booking->purpose }}</span></div>
        <div class="row"><span class="row-label">Place of Use</span><span class="row-value">{{ $booking->place_of_use }}</span></div>
        <div class="row"><span class="row-label">Start</span><span class="row-value">{{ \Carbon\Carbon::parse($booking->start_datetime)->timezone('Asia/Manila')->format('M d, Y h:i A') }}</span></div>
        <div class="row"><span class="row-label">End</span><span class="row-value">{{ \Carbon\Carbon::parse($booking->end_datetime)->timezone('Asia/Manila')->format('M d, Y h:i A') }}</span></div>
      @endif
      <div class="row"><span class="row-label">Submitted By</span><span class="row-value">{{ $booking->requestor_name }}</span></div>
    </div>

    <a class="cta-btn" href="http://localhost:5173/track">Track Your Request →</a>

    <div class="note">
      ⏰ <strong>Reminder:</strong> Please ensure you arrive at least <strong>30 minutes</strong> before your scheduled start time once your booking is approved.
    </div>

    <div class="note">
      ✅ <strong>What's next?</strong> Our staff will review your request and notify you once it has been approved or if additional information is needed. This usually takes 1–2 business days.
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.7;">
      If you did not submit this request, please contact us immediately at <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a>.
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
