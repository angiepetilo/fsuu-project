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
      padding: 22px 24px;
      text-align: center;
      color: #ffffff;
    }
    .banner-default  { background-color: #0f172a; border-bottom: 3px solid #2563eb; }
    .banner-success  { background-color: #064e3b; border-bottom: 3px solid #10b981; }
    .banner-warning  { background-color: #78350f; border-bottom: 3px solid #f59e0b; }
    .banner-danger   { background-color: #7f1d1d; border-bottom: 3px solid #ef4444; }
    .banner-info     { background-color: #0f172a; border-bottom: 3px solid #0284c7; }

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
      color: rgba(255, 255, 255, 0.75);
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .content {
      padding: 28px 24px;
    }
    .badge-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
    }
    .badge-pending  { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-success  { background-color: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-info     { background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .badge-neutral  { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .badge-danger   { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

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
      margin: 20px 0 8px 0;
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
      border-radius: 8px;
      padding: 14px 16px;
      margin: 20px 0;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .notice-info    { background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .notice-success { background-color: #f0fdf4; border: 1px solid #86efac; color: #166534; }
    .notice-warning { background-color: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .notice-danger  { background-color: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
    .notice-neutral { background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; }

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
    .gatepass-card {
      background-color: #f0fdf4;
      border: 2px dashed #16a34a;
      border-radius: 8px;
      padding: 16px 18px;
      margin: 18px 0;
    }
    .gatepass-header {
      border-bottom: 1px dashed #86efac;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .gatepass-badge {
      display: inline-block;
      background-color: #15803d;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

@php
    $isVenue = ($type ?? 'venue') === 'venue';
    $requestorName = $booking->filer_name 
        ?? $booking->requestor_name 
        ?? $booking->borrower_name 
        ?? trim(($booking->first_name ?? '') . ' ' . ($booking->last_name ?? '')) 
        ?: 'Requestor';

    $ref = $refCode ?? ($booking->reference_code ?? ($booking->trackingNumber?->reference_code ?? 'TRK-FSUU'));
    $venueName = $booking->venue?->name ?? 'AVR Facility';
    $venueLocation = $booking->venue?->location ?? 'Main Building';
    $sched = $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time');
    $purpose = $booking->purpose ?? ($isVenue ? 'Event Name' : 'University Purpose');
    $persons = $booking->no_of_person ?? ($booking->number_of_persons ?? 'N/A');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $trackUrl = $baseUrl . '/track?tracking=' . urlencode($ref);

    $classification = strtolower(trim((string)($booking->requestor_identity_type ?? $booking->classification ?? 'student')));
    $isExternal = str_contains($classification, 'external');
    $organization = $booking->program_office ?? $booking->department?->name ?? ($isExternal ? 'External Organization' : 'Department');
    $identityLabel = ucwords($booking->classification ?? $booking->requestor_identity_type ?? 'Student');

    // Date time formatted for usage and return
    $startTimeStr = $booking->time_start ? \Carbon\Carbon::parse("2000-01-01 " . $booking->time_start)->format('h:i A') : 'Start Time';
    $endTimeStr   = $booking->time_end ? \Carbon\Carbon::parse("2000-01-01 " . $booking->time_end)->format('h:i A') : 'End Time';
    $returnTimeStr = now()->format('M d, Y h:i A');

    // Staff names
    $releasedByName = null;
    try {
        $auditRel = \App\Models\AuditLog::with('user')
            ->where('auditable_id', $booking->id)
            ->where(function($q) use ($isVenue) {
                if ($isVenue) {
                    $q->whereIn('action', ['VENUE_BOOKING_RELEASED', 'booking_ongoing']);
                } else {
                    $q->whereIn('action', ['EQUIPMENT_BORROW_RELEASED']);
                }
            })
            ->latest('id')
            ->first();
        if ($auditRel) {
            $releasedByName = $auditRel->user?->name;
            if (!$releasedByName && !empty($auditRel->metadata['description'])) {
                if (preg_match('/by\s+(.+)$/i', (string)$auditRel->metadata['description'], $matches)) {
                    $releasedByName = trim($matches[1]);
                }
            }
        }
    } catch (\Throwable $e) {}

    if (!$releasedByName && !empty($booking->trackingNumber?->approvedBy?->name)) {
        $releasedByName = $booking->trackingNumber->approvedBy->name;
    }
    $staffName = $releasedByName ?: 'AVR Custodial Staff';

    $normStatus = strtolower(str_replace(['_', '-'], ' ', (string)($status ?? '')));

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

    // Resolve individual physical equipment units
    $assignedRaw = $booking->assigned_units ?? [];
    if (is_string($assignedRaw)) {
        try { $assignedRaw = json_decode($assignedRaw, true) ?? []; } catch (\Throwable $e) { $assignedRaw = []; }
    }
    if (empty($assignedRaw) && !empty($booking->equipment_units)) {
        $rawEqU = $booking->equipment_units;
        if (is_string($rawEqU)) {
            $dec = json_decode($rawEqU, true);
            $assignedRaw = is_array($dec) ? $dec : array_map('trim', explode(',', $rawEqU));
        } elseif (is_array($rawEqU)) {
            $assignedRaw = $rawEqU;
        }
    }

    $flatBarcodes = [];
    foreach ((array)$assignedRaw as $item) {
        if (is_string($item) || is_numeric($item)) {
            if (!empty($item)) $flatBarcodes[] = trim((string)$item);
        } elseif (is_array($item)) {
            $bc = $item['barcode'] ?? $item['serial_number'] ?? $item['id'] ?? null;
            if (!empty($bc)) $flatBarcodes[] = trim((string)$bc);
        } elseif (is_object($item)) {
            $bc = $item->barcode ?? $item->serial_number ?? $item->id ?? null;
            if (!empty($bc)) $flatBarcodes[] = trim((string)$bc);
        }
    }
    $barcodes = array_values(array_unique(array_filter($flatBarcodes)));

    $resolvedUnits = collect();
    if (!empty($barcodes)) {
        $numericIds = array_values(array_filter($barcodes, fn($v) => is_numeric($v) && (int)$v > 0));
        $unitCodes  = array_values(array_filter($barcodes, fn($v) => !empty($v)));
        try {
            $resolvedUnits = \App\Models\EquipmentUnit::with(['equipmentType'])->where(function($q) use ($unitCodes, $numericIds) {
                $q->whereIn('barcode', $unitCodes)
                  ->orWhereIn('serial_number', $unitCodes);
                if (!empty($numericIds)) { $q->orWhereIn('id', array_map('intval', $numericIds)); }
            })->get();
        } catch (\Throwable $e) {}
    }

    // Gate Pass eligibility:
    // - Equipment borrowing: ONLY when unique physical equipment units with serial numbers are together with it ($resolvedUnits->isNotEmpty()).
    // - Venue reservation: External client ($isExternal) OR venue reservation that has unique equipment units assigned ($resolvedUnits->isNotEmpty()).
    $hasGatePass = $isVenue ? ($isExternal || $resolvedUnits->isNotEmpty()) : $resolvedUnits->isNotEmpty();

    // Resolve inspection details if available
    $inspection = null;
    try {
        if (method_exists($booking, 'inspections') && $booking->relationLoaded('inspections')) {
            $inspection = $booking->inspections->first();
        } elseif (method_exists($booking, 'inspections')) {
            $inspection = $booking->inspections()->latest('id')->first();
        }
        if (!$inspection && !empty($booking->id)) {
            $inspectableType = $isVenue ? \App\Models\VenueBooking::class : \App\Models\EquipmentBorrow::class;
            $inspection = \App\Models\Inspection::where('inspectable_id', $booking->id)
                ->where(function($q) use ($isVenue, $inspectableType) {
                    $q->where('inspectable_type', $inspectableType);
                    if ($isVenue) {
                        $q->orWhere('inspectable_type', 'venue_booking')
                          ->orWhere('inspectable_type', 'avr_venue_booking');
                    } else {
                        $q->orWhere('inspectable_type', 'equipment_borrow')
                          ->orWhere('inspectable_type', 'avr_equipment_borrowing');
                    }
                })
                ->latest('id')
                ->first();
        }
    } catch (\Throwable $e) {}

    // Check for violations or damage
    $inspectionCondition = strtolower($inspection->condition ?? ($booking->condition ?? ''));
    $hasDamagedUnit = $inspectionCondition === 'damaged' || in_array($normStatus, ['damaged', 'damage noted', 'damage_noted']);
    $hasLostUnit = $inspectionCondition === 'lost' || in_array($normStatus, ['lost', 'missing']);

    // Check unit_conditions
    $unitCondRaw = $booking->unit_conditions ?? ($inspection->unit_conditions ?? null);
    if (is_string($unitCondRaw)) {
        try { $unitCondArr = json_decode($unitCondRaw, true) ?? []; } catch (\Throwable $e) { $unitCondArr = []; }
    } else {
        $unitCondArr = is_array($unitCondRaw) ? $unitCondRaw : [];
    }

    foreach ($unitCondArr as $ucVal) {
        $ucStr = strtolower(is_array($ucVal) ? ($ucVal['condition'] ?? '') : (string)$ucVal);
        if (str_contains($ucStr, 'damage') || str_contains($ucStr, 'defect')) {
            $hasDamagedUnit = true;
        }
        if (str_contains($ucStr, 'lost') || str_contains($ucStr, 'miss')) {
            $hasLostUnit = true;
        }
    }

    $rawViolationType = $inspection->violation_type ?? ($booking->violation_type ?? null);
    $isStrictlyLateViolation = !empty($rawViolationType) && in_array(strtolower(trim($rawViolationType)), ['late return', 'late return, extension', 'late return / extension']);
    $hasPolicyViolation = !empty($rawViolationType) && !$isStrictlyLateViolation;
    $hasViolationOrIncident = $hasDamagedUnit || $hasLostUnit || $hasPolicyViolation;
    $violationDetails = $hasPolicyViolation ? $rawViolationType : ($hasDamagedUnit ? 'Equipment Damage' : ($hasLostUnit ? 'Lost Equipment' : null));
    $inspectionNotes = $inspection->notes ?? ($booking->notes ?? ($remarks ?: null));
@endphp

<div class="wrapper">

{{-- =========================================================================
     TOP BANNER
   ========================================================================= --}}
@if(in_array($normStatus, ['overdue', 'late return', 'late_return', 'late', 'return past due notice', 'past due', 'past_due', 'exceed end time', 'exceeded end time', 'overtime']))
  <div class="top-banner banner-danger">
    <div class="header-title">{{ $isVenue ? 'PAST DUE NOTICE: VENUE RESERVATION' : 'OVERDUE EQUIPMENT NOTICE' }}</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif($hasViolationOrIncident && in_array($normStatus, ['completed', 'cleared', 'done', 'damaged', 'lost', 'inspection', 'post-inspection', 'post_inspection', 'inspected']))
  <div class="top-banner banner-danger">
    <div class="header-title">{{ $isVenue ? 'VENUE TURNOVER INCIDENT REPORT' : 'EQUIPMENT RETURN INCIDENT REPORT' }}</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['approved']))
  <div class="top-banner banner-success">
    <div class="header-title">{{ $isVenue ? 'VENUE RESERVATION CONFIRMED' : 'EQUIPMENT BORROWING APPROVED' }}</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['ready', 'ready for pickup', 'ready_for_pickup']))
  <div class="top-banner banner-info">
    <div class="header-title">EQUIPMENT READY FOR PICKUP</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['on going', 'on-going', 'ongoing', 'released', 'on_going', 'active']))
  <div class="top-banner banner-success">
    <div class="header-title">{{ $isVenue ? 'EVENT CHECK-IN CONFIRMED' : 'EQUIPMENT RELEASED' }}</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['event ended', 'event_ended', 'ended', 'concluded']))
  <div class="top-banner banner-default">
    <div class="header-title">EVENT CONCLUDED</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['inspection', 'post-inspection', 'post_inspection', 'inspected']))
  <div class="top-banner banner-info">
    <div class="header-title">{{ $isVenue ? 'POST-EVENT INSPECTION REPORT' : 'EQUIPMENT RETURN RECEIVED' }}</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['return', 'returned']))
  <div class="top-banner banner-info">
    <div class="header-title">EQUIPMENT RETURN RECEIVED</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@elseif(in_array($normStatus, ['completed', 'cleared', 'done']))
  <div class="top-banner banner-success">
    <div class="header-title">{{ $isVenue ? 'VENUE CLEARANCE RECEIPT' : 'EQUIPMENT CLEARANCE RECEIPT' }}</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@else
  <div class="top-banner banner-default">
    <div class="header-title">RESERVATION STATUS UPDATE</div>
    <div class="header-sub">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR)</div>
  </div>
@endif

  <div class="content">

{{-- =========================================================================
     PART 1: VENUE BOOKING
   ========================================================================= --}}
@if($isVenue)

  {{-- 1. VENUE: APPROVED --}}
  @if($normStatus === 'approved')
    <div>
      <span class="badge-pill badge-success">{{ $hasGatePass ? 'APPROVED & GATE PASS' : 'APPROVED' }}</span>
      @if($isExternal) <span class="badge-pill badge-info">External Client</span> @endif
    </div>

    <h1 class="email-heading">Your Venue Reservation is Confirmed!</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your request to book <strong>{{ $venueName }}</strong> has been officially approved. This email serves as your official Campus Access Permit.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Venue</td>
        <td class="data-value"><strong>{{ $venueName }}</strong> / {{ $venueLocation }}</td>
      </tr>
      <tr>
        <td class="data-label">Schedule</td>
        <td class="data-value">{{ $sched }}</td>
      </tr>
      <tr>
        <td class="data-label">Event Title</td>
        <td class="data-value"><strong>{{ $purpose }}</strong></td>
      </tr>
    </table>

    <div class="section-title">APPROVED INCLUDED EQUIPMENT:</div>
    <div class="items-box">
      @if($resolvedUnits->isNotEmpty())
        @foreach($resolvedUnits as $unit)
          <div class="item-row">
            &bull; <strong>{{ $unit->equipmentType?->name ?? 'AV Equipment' }}</strong> (Serial No: {{ $unit->serial_number ?: $unit->barcode }})
          </div>
        @endforeach
      @elseif(!empty($equipmentList))
        @foreach($equipmentList as $item)
          <div class="item-row">
            &bull; <strong>{{ $item['label'] }}</strong>
          </div>
        @endforeach
      @else
        <div class="item-row" style="color: #64748b;">
          None
        </div>
      @endif
    </div>

    <div class="notice-box notice-success">
      👮 <strong>NOTICE TO SECURITY &amp; STAFF:</strong> Grant venue ingress to bearer for the approved schedule and equipment listed above.
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="{{ $trackUrl }}" class="action-btn">View Gate Pass &amp; Details</a>
    </div>

  {{-- 2. VENUE: START EVENT / ON-GOING --}}
  @elseif(in_array($normStatus, ['on going', 'on-going', 'ongoing', 'released', 'on_going', 'active']))
    <div>
      <span class="badge-pill badge-success">IN PROGRESS</span>
    </div>

    <h1 class="email-heading">Your Event Has Officially Started</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your session at <strong>{{ $venueName }}</strong> has been checked in and is currently active.
      <span style="font-size: 11px; color: #16a34a; font-weight: 700; display: block; margin-top: 4px;">
        (Event Check-In Logged — Session Now On-Going)
      </span>
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Venue</td>
        <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td class="data-label">Check-in Time</td>
        <td class="data-value">{{ $startTimeStr }} &bull; {{ $sched }}</td>
      </tr>
      <tr>
        <td class="data-label">{{ $isExternal ? 'Organization' : 'Department' }}</td>
        <td class="data-value">{{ $organization }}</td>
      </tr>
      <tr>
        <td class="data-label">Event Title</td>
        <td class="data-value">{{ $purpose }}</td>
      </tr>
    </table>

    <div class="section-title">ACTIVE ON-SITE EQUIPMENT:</div>
    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 8px 0 16px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
          Assigned Venue Equipment Units:
        </div>
        @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
      </div>
    @else
      <div class="items-box">
        @if(!empty($equipmentList))
          @foreach($equipmentList as $item)
            <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong> (Active on-site)</div>
          @endforeach
        @else
          <div class="item-row" style="color: #64748b;">
            None
          </div>
        @endif
      </div>
    @endif

    <div class="notice-box notice-warning">
      ⚠️ <strong>REMINDER:</strong> Maintain sound levels within campus regulations. For technical support during your event, contact the AVR desk at Local 214.
    </div>

  {{-- 3. VENUE: END EVENT --}}
  @elseif(in_array($normStatus, ['event ended', 'event_ended', 'ended', 'concluded']))
    <div>
      <span class="badge-pill badge-neutral">EVENT ENDED</span>
    </div>

    <h1 class="email-heading">Thank You! Your Event Time Has Ended</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your booking for <strong>{{ $venueName }}</strong> ended at {{ $endTimeStr }}.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Check-out Time</td>
        <td class="data-value">{{ $endTimeStr }}</td>
      </tr>
      <tr>
        <td class="data-label">Inspection</td>
        <td class="data-value">Scheduled within 30 minutes</td>
      </tr>
    </table>

    <div class="section-title">EQUIPMENT TURNOVER CHECKLIST:</div>
    <div class="items-box">
      <div class="item-row">&bull; [ &nbsp; ] Turn off projector and air conditioning units</div>
      <div class="item-row">&bull; [ &nbsp; ] Leave venue-assigned microphones on the AV console</div>
      <div class="item-row">&bull; [ &nbsp; ] Collect all personal belongings and restore furniture layout</div>
    </div>

  {{-- 4. VENUE: INSPECTION --}}
  @elseif(in_array($normStatus, ['inspection', 'post-inspection', 'post_inspection', 'inspected']))
    @if($hasViolationOrIncident)
      <div>
        <span class="badge-pill badge-danger">VIOLATION NOTED</span>
      </div>

      <h1 class="email-heading">Post-Event Inspection: Infraction Recorded</h1>
      <p class="intro-text">
        Hi <strong>{{ $requestorName }}</strong>,<br>
        The post-event walk-through inspection for <strong>{{ $venueName }}</strong> has been conducted. A policy infraction was recorded during the facility inspection.
      </p>

      <table class="data-table">
        <tr>
          <td class="data-label">Reference Code</td>
          <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
        </tr>
        <tr>
          <td class="data-label">Inspector</td>
          <td class="data-value"><strong>{{ $staffName }}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Room Condition</td>
          <td class="data-value"><span style="color: #dc2626; font-weight: 700;">Violation Reported</span></td>
        </tr>
      </table>

      <div class="notice-box notice-danger">
        ⚠️ <strong>POLICY VIOLATION RECORDED:</strong><br>
        <strong>Infraction Category:</strong> {{ $violationDetails }}<br>
        @if(!empty($inspectionNotes))
          <strong>Inspector Remarks:</strong> "{{ $inspectionNotes }}"<br>
        @endif
        <div style="margin-top: 8px; font-size: 11.5px; color: #991b1b;">
          Please coordinate with the AVR Desk regarding this matter.
        </div>
      </div>
    @else
      <div>
        <span class="badge-pill badge-info">INSPECTION COMPLETED</span>
      </div>

      <h1 class="email-heading">Venue &amp; Equipment Inspection Finished</h1>
      <p class="intro-text">
        Hi <strong>{{ $requestorName }}</strong>,<br>
        The post-event walk-through inspection for <strong>{{ $venueName }}</strong> has been completed.
      </p>

      <table class="data-table">
        <tr>
          <td class="data-label">Reference Code</td>
          <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
        </tr>
        <tr>
          <td class="data-label">Inspector</td>
          <td class="data-value"><strong>{{ $staffName }}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Room Condition</td>
          <td class="data-value"><span style="color: #16a34a; font-weight: 700;">Clean</span></td>
        </tr>
      </table>

      <div class="notice-box notice-neutral">
        📝 <strong>INSPECTOR REMARKS:</strong><br>
        "{{ $remarks ?: 'Venue left in clean condition. All assigned AV equipment accounted for and in good working condition.' }}"
      </div>
    @endif

  {{-- 5. VENUE: COMPLETE RECEIPT --}}
  @elseif(in_array($normStatus, ['completed', 'cleared', 'done', 'damaged']))
    @if($hasViolationOrIncident)
      <div>
        <span class="badge-pill badge-danger">POLICY VIOLATION NOTED</span>
      </div>

      <h1 class="email-heading">Venue Session Concluded — Incident Recorded</h1>
      <p class="intro-text">
        Hi <strong>{{ $requestorName }}</strong>,<br>
        Your venue reservation for <strong>{{ $venueName }}</strong> has concluded. Physical turnover of the facility is logged, but policy violations or property damages were recorded on your account record.
      </p>

      <table class="data-table">
        <tr>
          <td class="data-label">Reference Code</td>
          <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
        </tr>
        <tr>
          <td class="data-label">Venue</td>
          <td class="data-value"><strong>{{ $venueName }}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Schedule</td>
          <td class="data-value">{{ $sched }}</td>
        </tr>
        <tr>
          <td class="data-label">Account Status</td>
          <td class="data-value"><span style="color: #dc2626; font-weight: 700;">Clearance Hold</span></td>
        </tr>
      </table>

      <div class="section-title">VERIFIED RETURNED EQUIPMENT:</div>
      @if($resolvedUnits->isNotEmpty())
        <div style="margin: 8px 0 16px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
            Returned Unit Inspection:
          </div>
          @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
        </div>
      @else
        <div class="items-box">
          @if(!empty($equipmentList))
            @foreach($equipmentList as $item)
              <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong></div>
            @endforeach
          @else
            <div class="item-row" style="color: #64748b;">
              None
            </div>
          @endif
        </div>
      @endif

      <div class="notice-box notice-danger">
        ⚠️ <strong>CLEARANCE HOLD:</strong><br>
        <strong>Noted Infraction:</strong> {{ $violationDetails }}<br>
        @if(!empty($inspectionNotes))
          <strong>Inspector Notes:</strong> "{{ $inspectionNotes }}"<br>
        @endif
        <div style="margin-top: 8px; font-size: 12px; color: #991b1b; line-height: 1.5;">
          A temporary clearance hold has been placed on your borrowing profile pending review. Please visit the AVR Office to resolve this infraction.
        </div>
      </div>
    @else
      <div>
        <span class="badge-pill badge-success">COMPLETED</span>
      </div>

      <h1 class="email-heading">Venue Transaction Closed</h1>
      <p class="intro-text">
        Hi <strong>{{ $requestorName }}</strong>,<br>
        Your venue reservation is officially completed. Custodial responsibility for <strong>{{ $venueName }}</strong> has been discharged in full standing.
      </p>

      <table class="data-table">
        <tr>
          <td class="data-label">Reference Code</td>
          <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
        </tr>
        <tr>
          <td class="data-label">Venue</td>
          <td class="data-value"><strong>{{ $venueName }}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Schedule</td>
          <td class="data-value">{{ $sched }}</td>
        </tr>
        <tr>
          <td class="data-label">Status</td>
          <td class="data-value"><span style="color: #16a34a; font-weight: 700;">Cleared</span></td>
        </tr>
      </table>

      <div class="section-title">VERIFIED RETURNED EQUIPMENT:</div>
      @if($resolvedUnits->isNotEmpty())
        <div style="margin: 8px 0 16px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
            Returned Unit Inspection:
          </div>
          @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
        </div>
      @else
        <div class="items-box">
          @if(!empty($equipmentList))
            @foreach($equipmentList as $item)
              <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong> — <span style="color: #16a34a; font-weight: 700;">Good Condition</span></div>
            @endforeach
          @else
            <div class="item-row" style="color: #64748b;">
              None
            </div>
          @endif
        </div>
      @endif

      <div class="notice-box notice-success">
        ✅ <strong>CLEARANCE CERTIFICATE:</strong> No liabilities or clearance holds remain on your account for this reservation.
      </div>
    @endif

  {{-- 6. VENUE: PAST DUE --}}
  @else
    <div>
      <span class="badge-pill badge-danger">PAST DUE</span>
    </div>

    <h1 class="email-heading">Venue Reservation Exceeded Scheduled End Time</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your booking for <strong>{{ $venueName }}</strong> has exceeded its scheduled end time.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Venue</td>
        <td class="data-value"><strong>{{ $venueName }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">Scheduled End</td>
        <td class="data-value">{{ $sched }}</td>
      </tr>
    </table>

    <div class="notice-box notice-danger">
      ⚠️ <strong>URGENT NOTICE:</strong> Please vacate the venue and finalize room turnover with the AVR staff immediately.
    </div>
  @endif

{{-- =========================================================================
     PART 2: EQUIPMENT BORROWING
   ========================================================================= --}}
@else

  {{-- 1. EQUIPMENT: APPROVED --}}
  @if($normStatus === 'approved')
    <div>
      <span class="badge-pill badge-success">{{ $hasGatePass ? 'APPROVED & GATE PASS' : 'APPROVED' }}</span>
    </div>

    <h1 class="email-heading">Your Request Has Been Approved</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your equipment borrowing request #{{ $ref }} has been approved. Gear has been earmarked for your schedule.
      <span style="display:none;">Equipment Borrowing Approved</span>
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Approved Date</td>
        <td class="data-value">{{ $sched }}</td>
      </tr>
      <tr>
        <td class="data-label">Pickup Desk</td>
        <td class="data-value">AVR Counter (Main Building, 2nd Floor)</td>
      </tr>
    </table>

    <div class="section-title">APPROVED ITEMS:</div>
    <div class="items-box">
      @if(!empty($equipmentList))
        @foreach($equipmentList as $item)
          <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong></div>
        @endforeach
      @else
        <div class="item-row">&bull; Audio-Visual Equipment Items</div>
      @endif
    </div>

    @if($hasGatePass)
      <div class="gatepass-card">
        <div class="gatepass-header">
          <span class="gatepass-badge">OFFICIAL CAMPUS GATE PASS</span>
          <div style="font-size: 11px; color: #166534; font-weight: 600; margin-top: 2px;">
            Authorized Equipment Gate Pass &bull; AVR / PMO
          </div>
        </div>
        @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
      </div>
    @endif

    <div class="notice-box notice-info">
      ℹ️ <strong>NEXT STEP:</strong> Present your valid FSUU ID at the AVR Counter during your schedule to scan physical units and claim equipment.
      @if(!$hasGatePass)
        <div style="margin-top: 6px; font-size: 11.5px; border-top: 1px dashed #bfdbfe; padding-top: 4px;">
          <em>Official Campus Gate Pass with individual equipment serial numbers will be issued once physical units are scanned at the AVR Custodial Counter.</em>
        </div>
      @endif
    </div>

  {{-- 2. EQUIPMENT: READY FOR PICK UP --}}
  @elseif(in_array($normStatus, ['ready', 'ready for pickup', 'ready_for_pickup']))
    <div>
      <span class="badge-pill badge-info">READY FOR PICKUP</span>
    </div>

    <h1 class="email-heading">Items Prepped &amp; Ready at Counter</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your requested equipment items have been tested, packed, and are ready for pickup at the AVR counter.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Pickup Location</td>
        <td class="data-value">AVR Custodial Counter (Main Building, 2nd Floor)</td>
      </tr>
      <tr>
        <td class="data-label">Counter Hours</td>
        <td class="data-value">8:00 AM – 5:00 PM</td>
      </tr>
    </table>

    <div class="section-title">PREPARED ITEMS:</div>
    <div class="items-box">
      @if(!empty($equipmentList))
        @foreach($equipmentList as $item)
          <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong> (Includes power supply &amp; cables)</div>
        @endforeach
      @else
        <div class="item-row">&bull; Borrowed Equipment Units (Tested &amp; Prepared)</div>
      @endif
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="{{ $trackUrl }}" class="action-btn">View Pickup Instructions</a>
    </div>

  {{-- 3. EQUIPMENT: RELEASED / ACTIVE CUSTODY --}}
  @elseif(in_array($normStatus, ['released', 'on going', 'on-going', 'ongoing', 'borrowed']))
    <div>
      <span class="badge-pill badge-success">RELEASED / ACTIVE CUSTODY &amp; GATE PASS</span>
      @if($isExternal) <span class="badge-pill badge-info">External Custody</span> @endif
    </div>

    <h1 class="email-heading">Items Handed Over</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      The equipment units listed below have been inspected, scanned, and released to your custody.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Released To</td>
        <td class="data-value"><strong>{{ $requestorName }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">Released By</td>
        <td class="data-value"><strong>{{ $staffName }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">RETURN DEADLINE</td>
        <td class="data-value"><strong style="color: #1e40af;">{{ $sched }}</strong></td>
      </tr>
    </table>

    <div class="section-title">SCANNED PHYSICAL UNITS &amp; SERIAL NUMBERS:</div>
    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 8px 0 16px 0;">
        @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
      </div>
    @else
      <div class="items-box">
        @if(!empty($equipmentList))
          @foreach($equipmentList as $item)
            <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong></div>
          @endforeach
        @endif
      </div>
    @endif

    <div class="notice-box notice-success">
      👮 <strong>GATE PASS PERMIT:</strong> Campus security personnel are authorized to clear transport of these specific serial numbers across campus gates.
    </div>

  {{-- 4. EQUIPMENT: RETURN RECEIVED --}}
  @elseif(in_array($normStatus, ['return', 'returned']))
    <div>
      <span class="badge-pill badge-info">RETURNED</span>
    </div>

    <h1 class="email-heading">Items Received at Counter</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Thank you! We have received the returned equipment for request #{{ $ref }}.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Return Time</td>
        <td class="data-value">{{ $returnTimeStr }}</td>
      </tr>
      <tr>
        <td class="data-label">Received By</td>
        <td class="data-value"><strong>{{ $staffName }}</strong></td>
      </tr>
    </table>

    <div class="section-title">RETURNED ITEMS:</div>
    <div class="items-box">
      @if($resolvedUnits->isNotEmpty())
        @foreach($resolvedUnits as $unit)
          <div class="item-row">
            &bull; <strong>{{ $unit->equipmentType?->name ?? 'Equipment Unit' }}</strong> (SN: {{ $unit->serial_number ?: $unit->barcode }}) — <span style="color: #2563eb; font-weight: 700;">Received</span>
          </div>
        @endforeach
      @elseif(!empty($equipmentList))
        @foreach($equipmentList as $item)
          <div class="item-row">
            &bull; <strong>{{ $item['label'] }}</strong> — <span style="color: #2563eb; font-weight: 700;">Received</span>
          </div>
        @endforeach
      @endif
    </div>

    <p style="font-size: 13px; color: #475569; margin: 16px 0;">
      Our team is currently testing hardware functionality and checking bundled cables. A final completion receipt will follow shortly.
    </p>

  {{-- 5. EQUIPMENT: COMPLETE CLEARANCE OR DAMAGE / VIOLATION --}}
  @elseif(in_array($normStatus, ['completed', 'cleared', 'done', 'damaged', 'lost']))
    @if($hasViolationOrIncident)
      <div>
        @if($hasLostUnit)
          <span class="badge-pill badge-danger">LOST EQUIPMENT</span>
        @elseif($hasDamagedUnit)
          <span class="badge-pill badge-danger">DAMAGE NOTED</span>
        @else
          <span class="badge-pill badge-danger">POLICY VIOLATION NOTED</span>
        @endif
      </div>

      <h1 class="email-heading">Equipment Return &amp; Incident Notice</h1>
      <p class="intro-text">
        Hi <strong>{{ $requestorName }}</strong>,<br>
        Your returned equipment for request #{{ $ref }} has been processed at the AVR counter. However, damages, missing components, or policy infractions were documented during inspection.
        <span style="display:none;">Custodial Clearance Certificate</span>
      </p>

      <table class="data-table">
        <tr>
          <td class="data-label">Reference Code</td>
          <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
        </tr>
        <tr>
          <td class="data-label">Borrower Name</td>
          <td class="data-value"><strong>{{ $requestorName }}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Date Returned</td>
          <td class="data-value">{{ $returnTimeStr }}</td>
        </tr>
        <tr>
          <td class="data-label">Account Status</td>
          <td class="data-value"><span style="color: #dc2626; font-weight: 700;">Clearance Hold</span></td>
        </tr>
      </table>

      <div class="section-title">INSPECTED EQUIPMENT STATUS:</div>
      @if($resolvedUnits->isNotEmpty())
        <div style="margin: 8px 0 16px 0;">
          @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
        </div>
      @else
        <div class="items-box">
          @if(!empty($equipmentList))
            @foreach($equipmentList as $item)
              <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong></div>
            @endforeach
          @endif
        </div>
      @endif

      <div class="notice-box notice-danger">
        ⚠️ <strong>LIABILITY ADVISORY:</strong><br>
        <strong>Reported Issue:</strong> {{ $violationDetails }}<br>
        @if(!empty($inspectionNotes))
          <strong>Inspection Notes:</strong> "{{ $inspectionNotes }}"<br>
        @endif
        <div style="margin-top: 8px; font-size: 12px; color: #991b1b; line-height: 1.5;">
          In accordance with FSUU AVR equipment custody policies, the borrower is accountable for repair costs, replacement of lost components, or resolution of policy breaches before university clearance can be certified. Please report to the AVR Custodial Counter.
        </div>
      </div>
    @else
      <div>
        <span class="badge-pill badge-success">COMPLETED</span>
      </div>

      <h1 class="email-heading">Borrowing Transaction Closed</h1>
      <p class="intro-text">
        Hi <strong>{{ $requestorName }}</strong>,<br>
        The borrowing request #{{ $ref }} is officially closed. All items have been verified and returned in good working order.
        <span style="display:none;">Custodial Clearance Certificate</span>
      </p>

      <table class="data-table">
        <tr>
          <td class="data-label">Reference Code</td>
          <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
        </tr>
        <tr>
          <td class="data-label">Borrower Name</td>
          <td class="data-value"><strong>{{ $requestorName }}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Date Returned</td>
          <td class="data-value">{{ $returnTimeStr }}</td>
        </tr>
        <tr>
          <td class="data-label">Final Status</td>
          <td class="data-value"><span style="color: #16a34a; font-weight: 700;">Closed</span></td>
        </tr>
      </table>

      <div class="section-title">VERIFIED &amp; RESTORED UNITS:</div>
      @if($resolvedUnits->isNotEmpty())
        <div style="margin: 8px 0 16px 0;">
          @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
        </div>
      @else
        <div class="items-box">
          @if(!empty($equipmentList))
            @foreach($equipmentList as $item)
              <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong> — <span style="color: #16a34a; font-weight: 700;">Good Condition</span></div>
            @endforeach
          @endif
        </div>
      @endif

      @if(!empty($remarks))
        <div style="font-size: 12.5px; color: #475569; margin: 10px 0;">
          <strong>Staff Notes:</strong> {{ $remarks }}
        </div>
      @endif

      <div class="notice-box notice-success">
        ✅ <strong>CLEARANCE CERTIFICATE:</strong> Your custodial accountability record for this transaction is officially closed in good standing.
      </div>
    @endif

  {{-- 6. EQUIPMENT: LATE RETURN --}}
  @elseif(in_array($normStatus, ['overdue', 'late return', 'late_return', 'late', 'return past due notice']))
    <div>
      <span class="badge-pill badge-danger">OVERDUE</span>
    </div>

    <h1 class="email-heading">Action Required: Outstanding Equipment Return</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Our records show that equipment borrowed under reference #{{ $ref }} has passed its scheduled return deadline and has not been returned yet.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Original Due</td>
        <td class="data-value"><strong style="color: #991b1b;">{{ $sched }}</strong></td>
      </tr>
      <tr>
        <td class="data-label">Time Overdue</td>
        <td class="data-value"><span style="color: #dc2626; font-weight: 700;">Overdue for Return</span></td>
      </tr>
    </table>

    <div class="section-title">OVERDUE PHYSICAL UNITS:</div>
    <div class="items-box">
      @if($resolvedUnits->isNotEmpty())
        @foreach($resolvedUnits as $unit)
          <div class="item-row">
            &bull; <strong>{{ $unit->equipmentType?->name ?? 'Equipment Unit' }}</strong> (SN: {{ $unit->serial_number ?: $unit->barcode }})
          </div>
        @endforeach
      @elseif(!empty($equipmentList))
        @foreach($equipmentList as $item)
          <div class="item-row">&bull; <strong>{{ $item['label'] }}</strong></div>
        @endforeach
      @endif
    </div>

    <div class="notice-box notice-danger">
      ⚠️ <strong>URGENT ACCOUNT ADVISORY:</strong><br>
      Please return these units to the AVR counter immediately. Unreturned gear disrupts scheduled classes and freezes your university borrowing privileges. Continued delay may lead to administrative clearance holds.
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="{{ $trackUrl }}" class="action-btn">Contact AVR Desk</a>
    </div>

  {{-- 7. EQUIPMENT: DEFAULT / OTHER --}}
  @else
    <div>
      <span class="badge-pill badge-neutral">{{ strtoupper($status ?? 'UPDATE') }}</span>
    </div>

    <h1 class="email-heading">Equipment Borrowing Status Update</h1>
    <p class="intro-text">
      Hi <strong>{{ $requestorName }}</strong>,<br>
      Your borrowing request #{{ $ref }} status has been updated to: <strong>{{ ucfirst($status ?? 'Updated') }}</strong>.
    </p>

    <table class="data-table">
      <tr>
        <td class="data-label">Reference Code</td>
        <td class="data-value"><span class="ref-code-value">[{{ $ref }}]</span></td>
      </tr>
      <tr>
        <td class="data-label">Schedule</td>
        <td class="data-value">{{ $sched }}</td>
      </tr>
    </table>

    @if(!empty($remarks))
      <div class="notice-box notice-info">
        <strong>Remarks:</strong> {{ $remarks }}
      </div>
    @endif
  @endif

@endif

  </div>

  <div class="footer">
    <strong>Father Saturnino Urios University</strong> &bull; Audio-Visual Resource Center (AVR)<br>
    <span style="font-size: 11px; color: #94a3b8;">This is an automated operational notice generated by the FSUU Booking System.</span>
  </div>
</div>

</body>
</html>
