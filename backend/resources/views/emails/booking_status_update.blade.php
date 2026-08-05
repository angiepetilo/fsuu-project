<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Status Update — FSUU</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; margin: 0; padding: 20px; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; color: #334155; margin-bottom: 16px; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    .summary-table td { padding: 8px 0; vertical-align: top; }
    .summary-table td.label { width: 140px; font-weight: 700; color: #475569; }
    .summary-table td.value { color: #0f172a; font-weight: 600; }
    .remarks-box { background: #f8fafc; border-left: 3px solid #64748b; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #334155; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; margin: 16px 0 24px; }
    .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
<div class="container">

  <p class="greeting">Good day, {{ $booking->requestor_name ?? $booking->filer_name ?? 'Requestor' }}!</p>

  @if($status === 'approved')
    <p class="text">
      Your {{ $type === 'venue' ? 'venue reservation' : 'equipment borrowing' }} (Reference: <strong>{{ $refCode }}</strong>) has been reviewed and <strong>approved</strong> by our staff.
    </p>
    @if(($booking->requestor_identity_type ?? '') === 'external')
      <p class="text">
        As an external requestor, please proceed to the office to complete the payment requirement before your scheduled event.
      </p>
    @endif
    <p class="text">
      Reminder: Please ensure you arrive at least 30 minutes before your scheduled start time.
    </p>
  @elseif($status === 'rejected')
    <p class="text">
      We regret to inform you that your {{ $type === 'venue' ? 'venue reservation' : 'equipment borrowing' }} (Reference: <strong>{{ $refCode }}</strong>) was not approved. Please see the staff remarks below for details.
    </p>
  @else
    <p class="text">
      Your {{ $type === 'venue' ? 'venue reservation' : 'equipment borrowing' }} (Reference: <strong>{{ $refCode }}</strong>) has been cancelled.
    </p>
  @endif

  <div class="section-title">REQUEST SUMMARY</div>

  <table class="summary-table">
    <tr>
      <td class="label">Reference Code:</td>
      <td class="value"><strong>{{ $refCode }}</strong></td>
    </tr>
    <tr>
      <td class="label">Type:</td>
      <td class="value">{{ $type === 'venue' ? 'Venue Reservation' : 'Equipment Borrowing' }}</td>
    </tr>
    <tr>
      <td class="label">Status:</td>
      <td class="value" style="text-transform: capitalize;">{{ $status }}</td>
    </tr>
    <tr>
      <td class="label">Start:</td>
      <td class="value">{{ $formattedStart }}</td>
    </tr>
    <tr>
      <td class="label">End:</td>
      <td class="value">{{ $formattedEnd }}</td>
    </tr>
  </table>

  @if($remarks)
  <div class="remarks-box">
    <strong>Staff Remarks:</strong><br>{{ $remarks }}
  </div>
  @endif

  <a class="btn" href="http://localhost:5173/track">Track Your Request &rarr;</a>

  <div class="footer">
    For inquiries, contact us at {{ config('mail.from.address') }}.<br>
    <strong>Father Saturnino Urios University</strong> &bull; Butuan City, Agusan del Norte, Philippines
  </div>

</div>
</body>
</html>

