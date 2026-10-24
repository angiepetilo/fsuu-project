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
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }
    .top-banner {
      background-color: #0f172a;
      color: #ffffff;
      padding: 22px 24px;
      text-align: center;
      border-bottom: 3px solid #2563eb;
    }
    .top-banner .header-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
      color: #ffffff;
    }
    .top-banner .header-sub {
      font-size: 11.5px;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .content {
      padding: 28px 24px;
    }
    .badge-pill {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
    }
    .badge-pill.badge-ext {
      background-color: #eff6ff;
      color: #1e40af;
      border-color: #bfdbfe;
      margin-left: 6px;
    }
    .email-heading {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px 0;
      letter-spacing: -0.3px;
    }
    .intro-text {
      font-size: 13.5px;
      color: #475569;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 18px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-label {
      width: 32%;
      font-weight: 700;
      color: #64748b;
    }
    .data-value {
      color: #0f172a;
      font-weight: 600;
    }
    .ref-code-value {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 16px;
      font-weight: 800;
      color: #1e40af;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      margin: 18px 0 8px 0;
    }
    .items-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .item-row {
      font-size: 13px;
      color: #0f172a;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .item-row:last-child {
      margin-bottom: 0;
    }
    .built-in-tag {
      display: inline-block;
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 10.5px;
      font-weight: 700;
      margin: 1px 2px;
    }
    .notice-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 14px 16px;
      margin: 20px 0;
      font-size: 12.5px;
      color: #1e40af;
      line-height: 1.5;
    }
    .action-btn {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.2px;
      margin: 8px 0 4px 0;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 18px 24px;
      text-align: center;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer strong {
      color: #334155;
    }
  </style>
</head>
<body>

@php
    $isEquip = ($type ?? 'venue') === 'equipment';
    $requestorName = $booking->filer_name 
        ?? $booking->requestor_name 
        ?? $booking->borrower_name 
        ?? trim(($booking->first_name ?? '') . ' ' . ($booking->last_name ?? '')) 
        ?: 'Requestor';

    $ref = $refCode ?? ($booking->reference_code ?? ($booking->trackingNumber?->reference_code ?? 'TRK-FSUU'));
    $venueName = $booking->venue?->name ?? 'AVR Facility';
    $venueLocation = $booking->venue?->location ?? 'Room Number';
    $sched = $formattedSchedule ?? ($formattedStart ?? ($booking->date_of_usage ? \Carbon\Carbon::parse($booking->date_of_usage)->format('M d, Y') : 'Scheduled Time'));
    $purpose = $booking->purpose ?? ($isEquip ? 'University Activity' : 'Event Name');
    $persons = $booking->no_of_person ?? ($booking->number_of_persons ?? 'N/A');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $trackUrl = $baseUrl . '/track?tracking=' . urlencode($ref);

    $classification = strtolower(trim((string)($booking->requestor_identity_type ?? $booking->classification ?? 'student')));
    $isExternal = str_contains($classification, 'external');
    $organization = $booking->program_office ?? $booking->department?->name ?? ($isExternal ? 'External Organization' : 'Department');
    $identityLabel = ucwords($booking->classification ?? $booking->requestor_identity_type ?? 'Student');

    // Build equipment list
    $equipmentList = [];
    if (!empty($booking->items) && count($booking->items) > 0) {
        foreach ($booking->items as $item) {
            $name = $item->equipmentType?->eq_name ?? $item->equipmentType?->name ?? $item->equipment_name ?? 'Equipment Item';
            $qty = $item->quantity_requested ?? $item->quantity ?? 1;
            $builtIns = [];
            if (!empty($item->built_in_names) && is_array($item->built_in_names)) {
                $builtIns = $item->built_in_names;
            } elseif (!empty($item->equipmentType?->built_in_names)) {
                $builtIns = $item->equipmentType->built_in_names;
            } elseif (!empty($item->equipment_type_id)) {
                try {
                    $eqType = \App\Models\EquipmentType::withTrashed()->find($item->equipment_type_id);
                    $builtIns = $eqType?->built_in_names ?? [];
                } catch (\Throwable $e) {}
            }
            $equipmentList[] = [
                'name'      => $name,
                'quantity'  => $qty,
                'label'     => "{$qty}x {$name}",
                'built_ins' => $builtIns,
            ];
        }
    } elseif (!empty($booking->venueBookingEquipment) && count($booking->venueBookingEquipment) > 0) {
        foreach ($booking->venueBookingEquipment as $item) {
            $name = $item->equipmentType?->eq_name ?? $item->equipmentType?->name ?? 'Equipment Item';
            $qty = $item->quantity_requested ?? 1;
            $builtIns = $item->equipmentType?->built_in_names ?? [];
            if (empty($builtIns) && !empty($item->equipment_type_id)) {
                try {
                    $eqType = \App\Models\EquipmentType::withTrashed()->find($item->equipment_type_id);
                    $builtIns = $eqType?->built_in_names ?? [];
                } catch (\Throwable $e) {}
            }
            $equipmentList[] = [
                'name'      => $name,
                'quantity'  => $qty,
                'label'     => "{$qty}x {$name}",
                'built_ins' => $builtIns,
            ];
        }
    } elseif (!empty($booking->equipment_items) && is_array($booking->equipment_items)) {
        foreach ($booking->equipment_items as $item) {
            $name = $item['name'] ?? $item['equipment_name'] ?? 'Equipment Item';
            $qty = $item['quantity'] ?? $item['quantity_requested'] ?? 1;
            $builtIns = $item['built_in_names'] ?? [];
            if (empty($builtIns) && !empty($item['equipment_type_id'])) {
                try {
                    $eqType = \App\Models\EquipmentType::withTrashed()->find($item['equipment_type_id']);
                    $builtIns = $eqType?->built_in_names ?? [];
                } catch (\Throwable $e) {}
            }
            $equipmentList[] = [
                'name'      => $name,
                'quantity'  => $qty,
                'label'     => "{$qty}x {$name}",
                'built_ins' => $builtIns,
            ];
        }
    } elseif (!empty($booking->equipment_name)) {
        $equipmentList[] = [
            'name'      => $booking->equipment_name,
            'quantity'  => 1,
            'label'     => $booking->equipment_name,
            'built_ins' => [],
        ];
    }
@endphp

<div class="wrapper">
  <!-- Header -->
  <div class="top-banner">
    <div class="header-title">
      {{ $isEquip ? 'EQUIPMENT BORROWING REQUEST RECEIVED' : 'VENUE RESERVATION REQUEST RECEIVED' }}
    </div>
    <div class="header-sub">
      Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)
    </div>
  </div>

  <div class="content">
    <div>
      <span class="badge-pill">PENDING REVIEW</span>
      @if($isExternal)
        <span class="badge-pill badge-ext">External Client</span>
      @endif
    </div>

    <h1 class="email-heading">
      {{ $isEquip ? 'Borrowing Request Submitted' : 'Request Submitted Successfully' }}
    </h1>

    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      @if($isEquip)
        We have received your request to borrow university equipment. Our custodial team is checking asset availability for your requested date.
      @else
        We have received your venue reservation request. Our staff is currently reviewing your schedule and equipment needs.
      @endif
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      @if($isEquip)
        <tr>
          <td class="data-label">Borrower</td>
          <td class="data-value"><strong>{{ $requestorName }}</strong> ({{ $identityLabel }}, {{ $organization }})</td>
        </tr>
        <tr>
          <td class="data-label">Requested Date</td>
          <td class="data-value">{{ $sched }}</td>
        </tr>
      @else
        <tr>
          <td class="data-label">Venue</td>
          <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
        </tr>
        <tr>
          <td class="data-label">Schedule</td>
          <td class="data-value">{{ $sched }}</td>
        </tr>
        <tr>
          <td class="data-label">Event Title</td>
          <td class="data-value"><strong>{{ $purpose }}</strong></td>
        </tr>
        @if($isExternal)
        <tr>
          <td class="data-label">Organization</td>
          <td class="data-value">{{ $organization }}</td>
        </tr>
        @endif
      @endif
    </table>

    <div class="section-title">
      {{ $isEquip ? 'REQUESTED ITEMS:' : 'REQUESTED VENUE EQUIPMENT:' }}
    </div>

    <div class="items-box">
      @if(!empty($equipmentList))
        @foreach($equipmentList as $item)
          <div class="item-row">
            &bull; <strong>{{ $item['label'] }}</strong>
            @if(!empty($item['built_ins']) && count($item['built_ins']) > 0)
              <div style="margin-left: 14px; margin-top: 2px;">
                <span style="font-size: 11px; font-weight: 700; color: #2563eb;">Included:</span>
                @foreach($item['built_ins'] as $bName)
                  <span class="built-in-tag">{{ $bName }}</span>
                @endforeach
              </div>
            @endif
          </div>
        @endforeach
      @else
        <div class="item-row" style="color: #64748b;">
          None
        </div>
      @endif
    </div>

    <div class="notice-box">
      <div>ℹ️ <strong>NOTICE:</strong> You will receive an email confirmation once your booking and equipment requests are verified and approved.</div>
      @if($isExternal)
        <div style="margin-top: 8px; font-size: 11.5px; border-top: 1px dashed #bfdbfe; padding-top: 6px; color: #1e3a8a;">
          📌 <em>Venue rental rates and utility requirements are assessed according to the university Fee Matrix. Please present a valid Government ID at the security gate upon entry.</em>
        </div>
      @endif
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="{{ $trackUrl }}" class="action-btn">
        {{ $isEquip ? 'Track Request Status' : 'Track Status Online' }}
      </a>
    </div>
  </div>

  <div class="footer">
    <strong>Father Saturnino Urios University</strong> &bull; Audio-Visual Resource Center (AVR)<br>
    <span style="font-size: 11px; color: #94a3b8;">This is an automated operational notice generated by the FSUU Booking System.</span>
  </div>
</div>

</body>
</html>
