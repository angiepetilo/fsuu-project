<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }
    .header { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 16px; border-bottom: 2px solid #eff6ff; padding-bottom: 12px; }
    .ref-box { background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 10px; padding: 14px; text-align: center; margin: 18px 0; }
    .ref-label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #1e40af; letter-spacing: 1px; }
    .ref-code { font-size: 24px; font-weight: 900; color: #1d4ed8; letter-spacing: 2px; margin-top: 4px; }
    .track-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; margin-top: 10px; }
    .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; }
    .details-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .details-row:last-child { margin-bottom: 0; }
    .details-label { font-weight: bold; color: #475569; }
    .details-value { color: #0f172a; font-weight: 600; }
    p { margin-bottom: 14px; }
    .signoff { margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
<div class="container">
@php
    $mode = $mode ?? ($status ?? 'pending');
    $requestorName = $booking->requestor_name ?? $booking->filer_name ?? $booking->borrower_name ?? 'Requestor';
    $ref = $refCode ?? ($booking->reference_code ?? ($booking->trackingNumber?->reference_code ?? 'TRK-FSUU'));
    $venueName = $booking->venue?->name ?? 'AVR Facility';
    $venueLocation = $booking->venue?->location ?? 'Main Campus';
    $start = $formattedStart ?? ($booking->time_start ?? 'Start Time');
    $end = $formattedEnd ?? ($booking->time_end ?? 'End Time');
    $purpose = $booking->purpose ?? 'University Event';
    $persons = $booking->no_of_person ?? ($booking->number_of_persons ?? 'N/A');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $trackUrl = $baseUrl . '/track?tracking=' . urlencode($ref);
@endphp

  <div class="header">
    Father Saturnino Urios University
  </div>

@if(($type ?? 'venue') === 'equipment')
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>Thank you for submitting your equipment borrowing request. Please find your official Tracking Reference Code below:</p>

  <div class="ref-box">
    <div class="ref-label">Official Tracking Reference Code</div>
    <div class="ref-code">{{ $ref }}</div>
  </div>

  <div class="details-box">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold; width: 40%;">Schedule:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $start }} to {{ $end }}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Purpose:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $purpose }}</td>
      </tr>
    </table>
  </div>

  <p><strong>Pickup Instructions:</strong> Please proceed to the designated office and present your physical <strong>School ID</strong>. Arrive at least 15 minutes before your scheduled start time.</p>
  <p style="text-align: center; margin: 16px 0;">
    <a href="{{ $trackUrl }}" class="track-btn">Track Request Status Online</a>
  </p>
@elseif($mode === 'approved')
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>Your venue reservation has been <strong style="color: #15803d;">APPROVED</strong>!</p>

  <div class="ref-box">
    <div class="ref-label">Booking Reference Code</div>
    <div class="ref-code">{{ $ref }}</div>
  </div>

  <div class="details-box">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold; width: 40%;">Venue:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $venueName }} ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Schedule:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $start }} to {{ $end }}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Purpose:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $purpose }}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Expected Attendees:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $persons }} persons</td>
      </tr>
    </table>
  </div>

  <p><em>Reminder: Please ensure you arrive at least 15 minutes before your scheduled start time.</em></p>
  <p style="text-align: center; margin: 16px 0;">
    <a href="{{ $trackUrl }}" class="track-btn">Track Reservation Status</a>
  </p>
@elseif($mode === 'reminder')
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>This is a friendly reminder that your venue reservation for <strong>{{ $venueName }}</strong> (Reference: <strong>{{ $ref }}</strong>) is scheduled for today from <strong>{{ $start }} to {{ $end }}</strong>.</p>
  <p><em>Reminder: Please ensure you arrive at least 15 minutes before your scheduled start time.</em></p>
@else
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>Thank you for submitting your venue reservation request. It has been received by the system and is currently awaiting staff review.</p>

  <div class="ref-box">
    <div class="ref-label">Official Tracking Reference Code</div>
    <div class="ref-code">{{ $ref }}</div>
  </div>

  <div class="details-box">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold; width: 40%;">Reserved Venue:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $venueName }} ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Reserved Schedule:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $start }} to {{ $end }}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Purpose:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $purpose }}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: bold;">Expected Attendees:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $persons }} persons</td>
      </tr>
    </table>
  </div>

  <p>You can track the status of your reservation at any time using your tracking code above.</p>
  <p style="text-align: center; margin: 16px 0;">
    <a href="{{ $trackUrl }}" class="track-btn">Track Booking Status Online</a>
  </p>
@endif

@php
    $sysSettings = \App\Models\SystemSetting::getSettings();
@endphp
  <div class="signoff" style="margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #64748b;">
    Respectfully,<br>
    <strong>{{ $sysSettings->system_name ?: 'System Administrator' }}</strong><br>
    {{ $sysSettings->organization_name ?: 'Father Saturnino Urios University' }}<br>
    @if(!empty($sysSettings->contact_phone)) Contact Phone: {{ $sysSettings->contact_phone }} &bull; @endif
    @if(!empty($sysSettings->contact_email)) Email: <a href="mailto:{{ $sysSettings->contact_email }}" style="color: #2563eb;">{{ $sysSettings->contact_email }}</a> @endif
  </div>
</div>
</body>
</html>
