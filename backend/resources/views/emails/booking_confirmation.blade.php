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
    $sched = $formattedSchedule ?? ($formattedStart ?? ($start . ' to ' . $end));
    $purpose = $booking->purpose ?? 'University Event';
    $persons = $booking->no_of_person ?? ($booking->number_of_persons ?? 'N/A');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $trackUrl = $baseUrl . '/track?tracking=' . urlencode($ref);

    $equipmentList = [];
    if (!empty($booking->items) && count($booking->items) > 0) {
        foreach ($booking->items as $item) {
            $name = $item->equipmentType?->eq_name ?? $item->equipmentType?->name ?? $item->equipment_name ?? 'Equipment Item';
            $qty = $item->quantity_requested ?? $item->quantity ?? 1;
            $equipmentList[] = "{$qty}x {$name}";
        }
    } elseif (!empty($booking->venueBookingEquipment) && count($booking->venueBookingEquipment) > 0) {
        foreach ($booking->venueBookingEquipment as $item) {
            $name = $item->equipmentType?->eq_name ?? $item->equipmentType?->name ?? 'Equipment Item';
            $qty = $item->quantity_requested ?? 1;
            $equipmentList[] = "{$qty}x {$name}";
        }
    } elseif (!empty($booking->equipment_items) && is_array($booking->equipment_items)) {
        foreach ($booking->equipment_items as $item) {
            $name = $item['name'] ?? $item['equipment_name'] ?? 'Equipment Item';
            $qty = $item['quantity'] ?? $item['quantity_requested'] ?? 1;
            $equipmentList[] = "{$qty}x {$name}";
        }
    } elseif (!empty($booking->equipment_name)) {
        $equipmentList[] = $booking->equipment_name;
    }
@endphp

  <div class="header">
    Father Saturnino Urios University
  </div>

@if(($type ?? 'venue') === 'equipment')
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>Thank you for submitting your equipment borrowing request. Please find your official confirmation details and Tracking Number below:</p>

  <div class="ref-box">
    <div class="ref-label">Official Tracking Number</div>
    <div class="ref-code">{{ $ref }}</div>
  </div>

  <div class="details-box">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold; width: 38%;">Borrower Name:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $requestorName }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Tracking Number:</td>
        <td style="padding: 5px 0; color: #2563eb; font-weight: bold; font-family: monospace;">{{ $ref }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Purpose:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $purpose }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Equipment Borrowed:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">
          {{ !empty($equipmentList) ? implode(', ', $equipmentList) : ($booking->equipment_name ?? 'Requested Equipment Items') }}
        </td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Date &amp; Time (Schedule):</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $sched }}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">
      📌 <strong>Grace Period &amp; Timely Arrival Advisory:</strong> Please proceed to the AVR counter with your physical <strong>School ID</strong>. Please arrive within the Grace Period (15 minutes) of your scheduled start time. Equipment not claimed within the Auto-Cancel threshold will be automatically released to other requestors.
    </p>
  </div>
  <p style="text-align: center; margin: 16px 0;">
    <a href="{{ $trackUrl }}" class="track-btn">Track Request Status Online</a>
  </p>
@elseif($mode === 'approved')
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>Your venue reservation has been <strong style="color: #15803d;">APPROVED</strong>!</p>

  <div class="ref-box">
    <div class="ref-label">Booking Tracking Number</div>
    <div class="ref-code">{{ $ref }}</div>
  </div>

  <div class="details-box">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold; width: 38%;">Requestor Name:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $requestorName }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Tracking Number:</td>
        <td style="padding: 5px 0; color: #2563eb; font-weight: bold; font-family: monospace;">{{ $ref }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Venue:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $venueName }} ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Purpose:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $purpose }}</td>
      </tr>
      @if(!empty($equipmentList))
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Equipment Borrowed:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ implode(', ', $equipmentList) }}</td>
      </tr>
      @endif
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Date &amp; Time (Schedule):</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $sched }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Expected Attendees:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $persons }} persons</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">
      📌 <strong>Grace Period &amp; Timely Arrival Advisory:</strong> Please ensure your organizers arrive within the Grace Period (15 minutes) of your scheduled start time. Reservations unattended past the Auto-Cancel threshold will be released.
    </p>
  </div>
  <p style="text-align: center; margin: 16px 0;">
    <a href="{{ $trackUrl }}" class="track-btn">Track Reservation Status</a>
  </p>
@elseif($mode === 'reminder')
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>This is a friendly reminder that your venue reservation for <strong>{{ $venueName }}</strong> (Tracking Number: <strong>{{ $ref }}</strong>) is scheduled for <strong>{{ $sched }}</strong>.</p>
  <p><em>Advisory: Please ensure you arrive within the Grace Period (15 minutes) of your scheduled start time.</em></p>
@else
  <p>Good day, <strong>{{ $requestorName }}</strong>.</p>
  <p>Thank you for submitting your venue reservation request. Please find your official confirmation details and Tracking Number below:</p>

  <div class="ref-box">
    <div class="ref-label">Official Tracking Number</div>
    <div class="ref-code">{{ $ref }}</div>
  </div>

  <div class="details-box">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold; width: 38%;">Requestor Name:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $requestorName }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Tracking Number:</td>
        <td style="padding: 5px 0; color: #2563eb; font-weight: bold; font-family: monospace;">{{ $ref }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Reserved Venue:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $venueName }} ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Purpose:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $purpose }}</td>
      </tr>
      @if(!empty($equipmentList))
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Equipment Borrowed:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ implode(', ', $equipmentList) }}</td>
      </tr>
      @endif
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Date &amp; Time (Schedule):</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $sched }}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #475569; font-weight: bold;">Expected Attendees:</td>
        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $persons }} persons</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">
      📌 <strong>Grace Period &amp; Timely Arrival Advisory:</strong> Please ensure you arrive within the Grace Period (15 minutes) of your scheduled start time. Unattended reservations past the Auto-Cancel threshold will be automatically released.
    </p>
  </div>
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
