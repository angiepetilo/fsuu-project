<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FSUU Reservation Notice</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #0f172a;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px 12px;
    }
    .wrapper {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .top-banner {
      background-color: #0f172a;
      color: #ffffff;
      padding: 18px 24px;
      border-bottom: 3px solid #2563eb;
    }
    .top-banner .org-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .top-banner .sub-title {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 3px;
    }
    .content {
      padding: 24px;
    }
    .ref-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      padding: 14px 18px;
      margin: 18px 0;
    }
    .ref-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
    }
    .ref-value {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 22px;
      font-weight: 800;
      color: #1e40af;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .badge-external {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #fde68a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 8px;
      vertical-align: middle;
    }
    .badge-internal {
      display: inline-block;
      background-color: #eff6ff;
      color: #1e40af;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 8px;
      vertical-align: middle;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 16px 0;
    }
    .data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-label {
      width: 36%;
      font-weight: 700;
      color: #475569;
    }
    .data-value {
      color: #0f172a;
      font-weight: 500;
    }
    .notice-box {
      border-radius: 6px;
      padding: 14px 16px;
      margin: 18px 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .notice-info {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e3a8a;
    }
    .notice-warning {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .notice-external {
      background-color: #faf5ff;
      border: 1px solid #e9d5ff;
      color: #581c87;
    }
    .notice-title {
      font-weight: 700;
      margin-bottom: 4px;
      display: block;
    }
    .track-btn {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 10px 22px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      margin: 12px 0 6px 0;
    }
    .signoff {
      border-top: 1px solid #e2e8f0;
      padding: 20px 24px;
      background-color: #f8fafc;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
  </style>
</head>
<body>

@php
    $mode = $mode ?? ($status ?? 'pending');
    $requestorName = $booking->filer_name 
        ?? $booking->requestor_name 
        ?? $booking->borrower_name 
        ?? trim(($booking->first_name ?? '') . ' ' . ($booking->last_name ?? '')) 
        ?: 'Requestor';

    $ref = $refCode ?? ($booking->reference_code ?? ($booking->trackingNumber?->reference_code ?? 'TRK-FSUU'));
    $venueName = $booking->venue?->name ?? 'AVR Facility';
    $venueLocation = $booking->venue?->location ?? 'Main Campus';
    $sched = $formattedSchedule ?? ($formattedStart ?? ($booking->date_of_usage ? \Carbon\Carbon::parse($booking->date_of_usage)->format('M d, Y') : 'Scheduled Time'));
    $purpose = $booking->purpose ?? 'University Activity';
    $persons = $booking->no_of_person ?? ($booking->number_of_persons ?? 'N/A');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $trackUrl = $baseUrl . '/track?tracking=' . urlencode($ref);

    $classification = strtolower(trim((string)($booking->requestor_identity_type ?? $booking->classification ?? 'student')));
    $isExternal = str_contains($classification, 'external');
    $organization = $booking->program_office ?? $booking->department?->name ?? ($isExternal ? 'External Organization' : 'Department');

    // Build equipment list
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

<div class="wrapper">
  <!-- Top Banner -->
  <div class="top-banner">
    <div class="org-title">Father Saturnino Urios University</div>
    <div class="sub-title">Audio-Visual Resource Center (AVR / PMO) &bull; Facilities &amp; Equipment Lending</div>
  </div>

  <div class="content">

  @if(($type ?? 'venue') === 'equipment')
    {{-- =========================================================
         EQUIPMENT BORROWING: PENDING / SUBMISSION RECEIPT
       ========================================================= --}}
    <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>
    <p>Your equipment borrowing request has been logged in the AVR queue. The custodial desk is checking inventory and unit readiness for your schedule.</p>

    <div class="ref-card">
      <div class="ref-label">
        Official Reference Code
        @if($isExternal)
          <span class="badge-external">External Client</span>
        @else
          <span class="badge-internal">FSUU Internal</span>
        @endif
      </div>
      <div class="ref-value">{{ $ref }}</div>
    </div>

    <table class="data-table">
      <tr>
        <td class="data-label">Accountable Borrower:</td>
        <td class="data-value"><strong>{{ $requestorName }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">{{ $isExternal ? 'Office / Organization:' : 'Department / College:' }}</td>
        <td class="data-value">{{ $organization }}</td>
      </tr>
      <tr>
        <td class="data-label">Intended Purpose:</td>
        <td class="data-value">{{ $purpose }}</td>
      </tr>
      <tr>
        <td class="data-label">Requested Items:</td>
        <td class="data-value">
          @if(!empty($equipmentList))
            @foreach($equipmentList as $eqItem)
              <div>&bull; {{ $eqItem }}</div>
            @endforeach
          @else
            {{ $booking->equipment_name ?? 'Equipment requested' }}
          @endif
        </td>
      </tr>
      <tr>
        <td class="data-label">Borrow Schedule:</td>
        <td class="data-value"><strong>{{ $sched }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">Pickup Location:</td>
        <td class="data-value">AVR Custodial Counter (2nd Floor, Main Building)</td>
      </tr>
    </table>

    @if($isExternal)
      <!-- External Client Guidance -->
      <div class="notice-box notice-external">
        <span class="notice-title">📌 External Client Verification Protocols:</span>
        <div>1. <strong>Identification:</strong> You must present a valid Government-Issued Photo ID (e.g. PhilID, Passport, Driver's License) or official Company/Agency ID upon pickup.</div>
        <div style="margin-top: 4px;">2. <strong>On-Campus Bound:</strong> External equipment loans must remain within the approved campus venue and cannot be transported off-campus.</div>
        <div style="margin-top: 4px;">3. <strong>Gate Clearance:</strong> Present this reference code at the FSUU Security Gate for entry verification.</div>
      </div>
    @else
      <!-- Internal Member Guidance -->
      <div class="notice-box notice-info">
        <span class="notice-title">📌 Counter Pickup Checklist:</span>
        <div>&bull; Present your physical <strong>FSUU School ID</strong> at the AVR Counter.</div>
        <div>&bull; Arrive 15 minutes before your scheduled start time. Unclaimed units are returned to stock after 20 minutes.</div>
      </div>
    @endif

    <div style="text-align: center; margin-top: 20px;">
      <a href="{{ $trackUrl }}" class="track-btn">Track Request Status Online &rarr;</a>
    </div>

  @elseif($mode === 'approved')
    {{-- =========================================================
         VENUE BOOKING: APPROVED
       ========================================================= --}}
    <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>
    <p>Your reservation request for <strong>{{ $venueName }}</strong> is confirmed. The room has been locked on the university facility calendar.</p>

    <div class="ref-card">
      <div class="ref-label">
        Booking Reference Code
        @if($isExternal)
          <span class="badge-external">External Reservation</span>
        @else
          <span class="badge-internal">FSUU Confirmed</span>
        @endif
      </div>
      <div class="ref-value">{{ $ref }}</div>
    </div>

    <table class="data-table">
      <tr>
        <td class="data-label">Organizer / Filer:</td>
        <td class="data-value"><strong>{{ $requestorName }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">{{ $isExternal ? 'Organization / Agency:' : 'Collegiate Department:' }}</td>
        <td class="data-value">{{ $organization }}</td>
      </tr>
      <tr>
        <td class="data-label">Reserved Venue:</td>
        <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td class="data-label">Event Purpose:</td>
        <td class="data-value">{{ $purpose }}</td>
      </tr>
      <tr>
        <td class="data-label">Event Schedule:</td>
        <td class="data-value"><strong>{{ $sched }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">Expected Pax:</td>
        <td class="data-value">{{ $persons }} attendees</td>
      </tr>
      @if(!empty($equipmentList))
      <tr>
        <td class="data-label">Bundled AV Equipment:</td>
        <td class="data-value">{{ implode(', ', $equipmentList) }}</td>
      </tr>
      @endif
    </table>

    @if($isExternal)
      <!-- External Client Financial / Entry Advisory -->
      <div class="notice-box notice-external">
        <span class="notice-title">🏢 External Client Venue &amp; Billing Advisory:</span>
        <div>1. <strong>Cashier Settlement:</strong> Rental fees and utility assessment must be settled at the FSUU Cashier (Main Building Ground Floor). Present the Official Receipt (O.R.) at the AVR office to validate room turnover.</div>
        <div style="margin-top: 4px;">2. <strong>Gate Pass &amp; Parking:</strong> Provide your Reference Code ({{ $ref }}) and attendee list to Campus Security at the main gate for smooth visitor ingress.</div>
        <div style="margin-top: 4px;">3. <strong>Photo ID:</strong> The designated event coordinator must present a valid Government Photo ID upon arrival.</div>
      </div>
    @else
      <div class="notice-box notice-info">
        <span class="notice-title">🏛️ Room Access &amp; Turnover Protocol:</span>
        <div>&bull; Have an authorized representative present their physical <strong>FSUU School ID</strong> at the AVR Counter 15 minutes before start time to collect the room key and aircon remotes.</div>
        <div style="margin-top: 4px;">&bull; Slots unattended 15 minutes past start time are subject to no-show release.</div>
      </div>
    @endif

    <div style="text-align: center; margin-top: 20px;">
      <a href="{{ $trackUrl }}" class="track-btn">View Reservation Pass &rarr;</a>
    </div>

  @elseif($mode === 'reminder')
    {{-- =========================================================
         VENUE BOOKING: REMINDER
       ========================================================= --}}
    <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>
    <p>This is an operational reminder that your reservation for <strong>{{ $venueName }}</strong> is scheduled for today.</p>

    <div class="ref-card">
      <div class="ref-label">Reference: {{ $ref }}</div>
      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px;">
        {{ $sched }}
      </div>
    </div>

    <div class="notice-box notice-warning">
      <span class="notice-title">⏰ Arrival &amp; Setup Window:</span>
      <div>&bull; The room will be opened 15–30 minutes before your program begins.</div>
      <div>&bull; Report to the AVR Custodial Counter or meet the on-duty technician at the venue.</div>
      @if($isExternal)
        <div style="margin-top: 4px;">&bull; Ensure the Cashier Official Receipt (O.R.) and valid Government ID are ready upon facility check-in.</div>
      @else
        <div style="margin-top: 4px;">&bull; Please ensure your group vacates on time to allow scheduled cleanup for succeeding university reservations.</div>
      @endif
    </div>

    <div style="text-align: center; margin-top: 18px;">
      <a href="{{ $trackUrl }}" class="track-btn">Track Live Status &rarr;</a>
    </div>

  @else
    {{-- =========================================================
         VENUE BOOKING: PENDING / SUBMISSION RECEIPT
       ========================================================= --}}
    <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>
    <p>Your venue reservation request has been submitted to the AVR Facility Office. Our staff is verifying schedule availability and facility maintenance calendars.</p>

    <div class="ref-card">
      <div class="ref-label">
        Official Reference Code
        @if($isExternal)
          <span class="badge-external">External Client</span>
        @else
          <span class="badge-internal">FSUU Internal</span>
        @endif
      </div>
      <div class="ref-value">{{ $ref }}</div>
    </div>

    <table class="data-table">
      <tr>
        <td class="data-label">Organizer Name:</td>
        <td class="data-value"><strong>{{ $requestorName }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">{{ $isExternal ? 'Office / Organization:' : 'Department / College:' }}</td>
        <td class="data-value">{{ $organization }}</td>
      </tr>
      <tr>
        <td class="data-label">Requested Venue:</td>
        <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td class="data-label">Date &amp; Schedule:</td>
        <td class="data-value"><strong>{{ $sched }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">Event Purpose:</td>
        <td class="data-value">{{ $purpose }}</td>
      </tr>
      <tr>
        <td class="data-label">Expected Pax:</td>
        <td class="data-value">{{ $persons }} persons</td>
      </tr>
      @if(!empty($equipmentList))
      <tr>
        <td class="data-label">Included Equipment:</td>
        <td class="data-value">{{ implode(', ', $equipmentList) }}</td>
      </tr>
      @endif
    </table>

    @if($isExternal)
      <div class="notice-box notice-external">
        <span class="notice-title">🏢 Note for External Clients &amp; Organizations:</span>
        <div>&bull; Venue rental rates and utility requirements are assessed according to the university Fee Matrix.</div>
        <div style="margin-top: 4px;">&bull; Payment scheduling will be finalized only after administrative approval. You will receive an approved billing assessment notice before payment is required.</div>
        <div style="margin-top: 4px;">&bull; Present a valid Government ID at the security gate on the date of activity.</div>
      </div>
    @else
      <div class="notice-box notice-info">
        <span class="notice-title">📌 Next Steps for Organizers:</span>
        <div>&bull; Keep your Reference Code <strong>{{ $ref }}</strong> for tracking.</div>
        <div>&bull; If your event requires an endorsement letter, ensure the file is clearly legible on your submission portal.</div>
        <div>&bull; You will receive an official notification once the slot is confirmed.</div>
      </div>
    @endif

    <div style="text-align: center; margin-top: 20px;">
      <a href="{{ $trackUrl }}" class="track-btn">Track Reservation Status &rarr;</a>
    </div>
  @endif

  </div>

  @php
      $sysSettings = \App\Models\SystemSetting::getSettings();
  @endphp
  <!-- Footer / Signoff -->
  <div class="signoff">
    <strong>{{ $sysSettings->system_name ?: 'AVR Operations Management' }}</strong><br>
    {{ $sysSettings->organization_name ?: 'Father Saturnino Urios University' }} &bull; Audio-Visual Resource Center (AVR / PMO)<br>
    Location: Main Building, Ground &amp; 2nd Floor &bull; Desk Extension: Local 214<br>
    @if(!empty($sysSettings->contact_email)) Email: <a href="mailto:{{ $sysSettings->contact_email }}" style="color: #2563eb; text-decoration: none;">{{ $sysSettings->contact_email }}</a> &bull; @endif
    @if(!empty($sysSettings->contact_phone)) Phone: {{ $sysSettings->contact_phone }} @endif
    <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
      This is an automated operational notice generated by the FSUU Venue Reservation &amp; Equipment Lending System.
    </div>
  </div>
</div>

</body>
</html>
