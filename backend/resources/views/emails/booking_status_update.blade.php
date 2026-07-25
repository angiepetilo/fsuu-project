<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Update — FSUU</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header-approved { background: linear-gradient(135deg, #065f46 0%, #059669 100%); }
    .header-rejected { background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); }
    .header-cancelled { background: linear-gradient(135deg, #374151 0%, #6b7280 100%); }
    .header { padding: 40px 36px 36px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; margin: 0 0 6px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.65); font-size: 13px; margin: 0; }
    .status-icon { font-size: 48px; margin-bottom: 12px; }
    .body { padding: 36px; }
    .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    .message-box-approved { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 12px; padding: 18px; margin-bottom: 24px; color: #166534; font-size: 14px; line-height: 1.7; }
    .message-box-rejected { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 12px; padding: 18px; margin-bottom: 24px; color: #991b1b; font-size: 14px; line-height: 1.7; }
    .message-box-cancelled { background: #f9fafb; border: 1px solid #d1d5db; border-left: 4px solid #9ca3af; border-radius: 12px; padding: 18px; margin-bottom: 24px; color: #374151; font-size: 14px; line-height: 1.7; }
    .details-box { background: #f8faff; border: 1px solid #e0e7ff; border-radius: 14px; padding: 24px; margin-bottom: 24px; }
    .details-box h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin: 0 0 16px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8edf5; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .row-label { color: #64748b; font-weight: 600; }
    .row-value { color: #0f172a; font-weight: 700; text-align: right; }
    .remarks-box { background: #fef9c3; border: 1px solid #fde68a; border-radius: 12px; padding: 18px; margin-bottom: 24px; font-size: 13px; color: #713f12; }
    .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; margin: 0 auto 24px; }
    .footer { background: #f8faff; border-top: 1px solid #e8edf5; padding: 20px 36px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header header-{{ $status }}">
    <div class="status-icon">
      @if($status === 'approved') ✅
      @elseif($status === 'rejected') ❌
      @else 🚫
      @endif
    </div>
    <h1>🎓 FSUU Reserve &amp; Booking System</h1>
    <p>Father Saturnino Urios University, Butuan City</p>
  </div>

  <div class="body">
    <p class="greeting">Good day, {{ $booking->requestor_name }}!</p>

    <div class="message-box-{{ $status }}">
      @if($status === 'approved')
        🎉 <strong>Your request has been Approved!</strong><br>
        Your {{ $type === 'venue' ? 'venue reservation' : 'equipment borrowing' }} (Reference: <strong>{{ $booking->reference_code }}</strong>)
        has been reviewed and <strong>approved</strong> by our staff.
        @if($booking->requestor_identity_type === 'external')
          <br><br>⚠ As an external requestor, please proceed to the office to complete the payment requirement before your scheduled event.
        @endif
        <br><br>⏰ <strong>Reminder:</strong> Please ensure you arrive at least <strong>30 minutes</strong> before your scheduled start time.
      @elseif($status === 'rejected')
        😔 <strong>Your request was not approved.</strong><br>
        We regret to inform you that your {{ $type === 'venue' ? 'venue reservation' : 'equipment borrowing' }}
        (Reference: <strong>{{ $booking->reference_code }}</strong>) has been <strong>rejected</strong>.
        Please see the remarks below for details.
      @else
        Your {{ $type === 'venue' ? 'venue reservation' : 'equipment borrowing' }}
        (Reference: <strong>{{ $booking->reference_code }}</strong>) has been <strong>cancelled</strong>.
      @endif
    </div>

    <div class="details-box">
      <h3>📋 Request Summary</h3>
      <div class="row"><span class="row-label">Reference Code</span><span class="row-value">{{ $booking->reference_code }}</span></div>
      <div class="row"><span class="row-label">Type</span><span class="row-value">{{ $type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing' }}</span></div>
      <div class="row"><span class="row-label">Status</span><span class="row-value" style="text-transform:capitalize;">{{ $status }}</span></div>
      <div class="row"><span class="row-label">Start</span><span class="row-value">{{ \Carbon\Carbon::parse($booking->start_datetime)->timezone('Asia/Manila')->format('M d, Y h:i A') }}</span></div>
      <div class="row"><span class="row-label">End</span><span class="row-value">{{ \Carbon\Carbon::parse($booking->end_datetime)->timezone('Asia/Manila')->format('M d, Y h:i A') }}</span></div>
    </div>

    @if($remarks)
    <div class="remarks-box">
      <strong>📝 Staff Remarks:</strong><br>{{ $remarks }}
    </div>
    @endif

    <a class="cta-btn" href="http://localhost:5173/track">Track Your Request →</a>

    <p style="font-size:13px;color:#64748b;line-height:1.7;">
      For inquiries, contact us at <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a>.
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
