<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #ffffff; margin: 0; padding: 20px; }
    p { margin-bottom: 16px; }
    .summary-block { font-family: monospace; font-size: 13px; margin: 16px 0; }
    .signoff { margin-top: 24px; }
  </style>
</head>
<body>
@php
    $requestorName = $booking->requestor_name ?? $booking->filer_name ?? 'Requestor';
    $ref = $refCode ?? ($booking->reference_code ?? 'TRK-FSUU');
    $itemType = ($type ?? 'venue') === 'venue' ? 'venue reservation' : 'equipment borrowing';
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'http://localhost:5173'), '/');
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

@php
    $normStatus = strtolower(str_replace(['_', '-'], ' ', (string)($status ?? '')));
@endphp

@if(in_array($normStatus, ['overdue', 'passed due', 'return past due notice']))
<div style="border-bottom: 2px solid #fecaca; padding-bottom: 12px; margin-bottom: 16px;">
  <p style="font-size: 16px; font-weight: bold; color: #dc2626; margin: 0;">⚠️ RETURN PAST DUE NOTICE</p>
  <span style="font-size: 12px; color: #64748b;">Father Saturnino Urios University &bull; Audio-Visual Resource Center (PMO / AVR)</span>
</div>
<p>Good day, <strong>{{ $requestorName }}</strong>.</p>
@if(($type ?? 'venue') === 'equipment')
<p>The scheduled return time for the equipment unit(s) borrowed under Reference Code <strong>{{ $ref }}</strong> has elapsed. Please return all physical units immediately to the PMO / AVR office finalize condition clearance and prevent late policy penalties.</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0; color: #991b1b; font-weight: bold;">
    This equipment borrowing is already past due. Please return the equipment immediately to the PMO / AVR office.
  </p>
</div>
@else
<p>This serves as an official <strong>1st Warning</strong>: Your venue reservation [<strong>{{ $ref }}</strong>] (Scheduled: {{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}) has <strong>exceeded its scheduled end time</strong>.</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0; color: #991b1b; font-weight: bold;">
    Please conclude your event and vacate the premises immediately for post-event facility turnover and inspection. Delaying succeeding reservations violates campus facility utilization policies.
  </p>
</div>
@endif

@elseif(in_array($normStatus, ['cancelled', 'auto cancelled', 'auto-cancelled', 'auto_cancelled']))
<div style="border-bottom: 2px solid #fecaca; padding-bottom: 12px; margin-bottom: 16px;">
  <p style="font-size: 16px; font-weight: bold; color: #dc2626; margin: 0;">RESERVATION AUTOMATICALLY CANCELLED (NO-SHOW)</p>
  <span style="font-size: 12px; color: #64748b;">Father Saturnino Urios University &bull; Audio-Visual Resource Center</span>
</div>
<p>Good day, <strong>{{ $requestorName }}</strong>.</p>
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] scheduled for {{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }} has been <strong>AUTOMATICALLY CANCELLED</strong> due to client no-show past the designated auto-cancel window.</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0; color: #991b1b; font-weight: 600;">{{ $remarks ?? 'The scheduled start time and auto-cancel threshold elapsed without event check-in or equipment collection.' }}</p>
</div>
<p style="font-size: 13px; color: #475569;">
  The reserved facility or equipment items have been released. If you believe this cancellation was executed in error, please contact the AVR Center Administrator or Super Admin immediately for an administrative override.
</p>

@elseif(in_array($normStatus, ['exceed end time', 'exceeded end time', 'overtime']))
<p style="font-size: 16px; font-weight: bold; color: #dc2626;">URGENT NOTICE: RESERVATION EXCEEDED SCHEDULED END TIME</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] (Scheduled: {{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}) has <strong>exceeded its scheduled end time</strong>.</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #991b1b; font-weight: 600;">{{ $remarks ?? 'Please wrap up your activity immediately to avoid disrupting succeeding scheduled bookings and to complete post-use facility inspection.' }}</p>
</div>
<p>If you require an extension, please contact the AVR Center Administrator immediately.</p>

@elseif(in_array($normStatus, ['late return', 'late']))
<p style="font-size: 16px; font-weight: bold; color: #b45309;">NOTICE OF LATE RETURN TURNOVER</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your turnover for {{ $itemType }} [<strong>{{ $ref }}</strong>] has been received and logged as a <strong>Late Return</strong>.</p>
<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0 0 6px 0; font-weight: bold; color: #92400e;">Turnover Record:</p>
  <p style="margin: 0; color: #78350f;">{{ $remarks ?? 'Item returned after the scheduled end time.' }}</p>
</div>
<p>Please be reminded to adhere strictly to scheduled return times in future borrowings to ensure equipment availability for other university requestors.</p>

@elseif(in_array($normStatus, ['on going', 'on-going', 'ongoing', 'released', 'on_going']))
@php
    // Resolve assigned physical units from barcodes/ids stored in $booking->assigned_units
    // Works for both type='equipment' and type='venue' (venue with equipment units).
    $assignedRaw  = $booking->assigned_units ?? [];
    if (is_string($assignedRaw)) {
        try { $assignedRaw = json_decode($assignedRaw, true) ?? []; } catch (\Throwable $e) { $assignedRaw = []; }
    }
    $barcodes = array_values(array_filter((array)$assignedRaw, fn($v) => !empty($v)));
    $resolvedUnits = collect();
    if (!empty($barcodes)) {
        $numericIds = array_values(array_filter($barcodes, fn($v) => is_numeric($v) && (int)$v > 0));
        $unitCodes  = array_values(array_filter($barcodes, fn($v) => !empty($v)));
        try {
            $resolvedUnits = \App\Models\EquipmentUnit::where(function($q) use ($unitCodes, $numericIds) {
                $q->whereIn('barcode', $unitCodes);
                if (!empty($numericIds)) { $q->orWhereIn('id', array_map('intval', $numericIds)); }
            })->get();
        } catch (\Throwable $e) {}
    }
@endphp
<div style="border-bottom: 2px solid #dcfce7; padding-bottom: 12px; margin-bottom: 16px;">
  <p style="font-size: 16px; font-weight: bold; color: #15803d; margin: 0;">EQUIPMENT RELEASED — BORROWING NOW ON-GOING</p>
  <span style="font-size: 12px; color: #64748b;">Father Saturnino Urios University &bull; AVR Custodial Services</span>
</div>
<p>Good day, <strong>{{ $requestorName }}</strong>.</p>
<p>Your borrowed equipment unit(s) have been officially <strong style="color:#15803d;">released and handed over</strong> to you. Please find the full unit list below:</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
  <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">Released Units — {{ $ref }}</div>
  @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release'])
</div>

<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">
    ⏰ <strong>Return Deadline:</strong> {{ $formattedSchedule ?? ($formattedEnd ?? 'Please refer to your schedule.') }}
  </p>
</div>
<p style="color: #374151; font-size: 13px; margin: 14px 0;">Please return the equipment on time to avoid a violation record.</p>

@elseif(in_array($normStatus, ['completed', 'returned', 'done', 'cleared']))
@php
    // Resolve physical units WITH their recorded inspection conditions.
    // Works for both type='equipment' and type='venue' (venue with equipment units).
    $assignedRaw   = $booking->assigned_units ?? [];
    if (is_string($assignedRaw)) {
        try { $assignedRaw = json_decode($assignedRaw, true) ?? []; } catch (\Throwable $e) { $assignedRaw = []; }
    }
    $barcodes = array_values(array_filter((array)$assignedRaw, fn($v) => !empty($v)));

    $unitCondMap = [];
    if (!empty($booking->unit_conditions)) {
        $raw = $booking->unit_conditions;
        if (is_string($raw)) { try { $raw = json_decode($raw, true) ?? []; } catch (\Throwable $e) { $raw = []; } }
        $unitCondMap = (array)$raw;
    }

    $resolvedUnits = collect();
    if (!empty($barcodes)) {
        $numericIds = array_values(array_filter($barcodes, fn($v) => is_numeric($v) && (int)$v > 0));
        $unitCodes  = array_values(array_filter($barcodes, fn($v) => !empty($v)));
        try {
            $dbUnits = \App\Models\EquipmentUnit::where(function($q) use ($unitCodes, $numericIds) {
                $q->whereIn('barcode', $unitCodes);
                if (!empty($numericIds)) { $q->orWhereIn('id', array_map('intval', $numericIds)); }
            })->get();
            $resolvedUnits = $dbUnits->map(function ($unit) use ($unitCondMap, $assignedRaw) {
                $key = $unit->barcode ?? $unit->serial_number;
                $foundCond = $unitCondMap[$key] ?? null;
                if (!$foundCond) {
                    foreach ($assignedRaw as $idx => $bc) {
                        if ((string)$bc === (string)$key && isset($unitCondMap[$idx])) {
                            $foundCond = $unitCondMap[$idx];
                            break;
                        }
                    }
                }
                if ($foundCond) {
                    $condStr = is_array($foundCond) ? ($foundCond['condition'] ?? $foundCond['status'] ?? 'Good') : (string)$foundCond;
                    $unit->condition = ucfirst(strtolower(trim($condStr)));
                }
                return $unit;
            });
        } catch (\Throwable $e) {}
    }

    $hasReturnedUnits = $resolvedUnits->isNotEmpty();

    // Clearance label — used when per-unit table is shown
    $finalBorrowStatus = strtolower($booking->status ?? $booking->trackingNumber?->status ?? 'completed');
    $clearanceStatus = match(true) {
        str_contains($finalBorrowStatus, 'late')    => 'CLEARED — LATE RETURN',
        str_contains($finalBorrowStatus, 'damaged') => 'CLEARED — DAMAGE NOTED',
        str_contains($finalBorrowStatus, 'lost')    => 'INCOMPLETE — UNIT LOST',
        default => 'CLEARED / RETURN COMPLETED',
    };
    $clearanceColor = str_contains($clearanceStatus, 'CLEARED') ? '#15803d' : '#991b1b';
@endphp
@if($hasReturnedUnits)
<div style="border-bottom: 2px solid #22c55e; padding-bottom: 12px; margin-bottom: 16px;">
  <p style="font-size: 16px; font-weight: bold; color: #15803d; margin: 0;">OFFICIAL RETURN RECEIPT &amp; CUSTODIAL CLEARANCE</p>
  <span style="font-size: 12px; color: #64748b;">Father Saturnino Urios University &bull; Audio-Visual Resource Center</span>
</div>

<p>Good day, <strong>{{ $requestorName }}</strong>.</p>
<p>This email serves as your <strong>Official Return Receipt and Custodial Clearance Certificate</strong> for the equipment borrowing transaction below:</p>

<div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 16px; margin: 18px 0;">
  <div style="border-bottom: 1px dashed #bbf7d0; padding-bottom: 8px; margin-bottom: 10px; display:flex; justify-content:space-between;">
    <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #166534;">Tracking Number:</span>
    <span style="font-size: 14px; font-weight: 900; color: #15803d; font-family: monospace;">{{ $ref }}</span>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr>
      <td style="padding: 5px 0; color: #475569; font-weight: bold; width: 38%;">Borrower:</td>
      <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $requestorName }}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0; color: #475569; font-weight: bold;">Purpose:</td>
      <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $booking->purpose ?? 'University Activity' }}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0; color: #475569; font-weight: bold;">Borrow Schedule:</td>
      <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0; color: #475569; font-weight: bold;">Returned On:</td>
      <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{{ now()->format('M d, Y h:i A') }}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0; color: #475569; font-weight: bold;">Clearance Status:</td>
      <td style="padding: 5px 0; font-weight: 800; color: {{ $clearanceColor }};">✓ {{ $clearanceStatus }}</td>
    </tr>
  </table>
</div>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
  <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">Returned Units — Per-Unit Inspection Record</div>
  @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt'])
</div>

@if(!empty($remarks))
<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0;">
  <p style="margin:0;font-weight:bold;color:#92400e;font-size:12px;">Inspection Notes:</p>
  <p style="margin:4px 0 0;color:#78350f;font-size:13px;">{{ $remarks }}</p>
</div>
@endif

<p style="font-size: 12px; color: #475569; font-style: italic;">
  All physical units and included accessories have been inspected and accounted for by the custodial staff. Your custodial accountability record for this requisition is officially cleared.
</p>
@else
<p style="font-size: 16px; font-weight: bold; color: #15803d;">RESERVATION COMPLETED &amp; CLEARED</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] ({{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}) has been marked as <strong>COMPLETED</strong>.</p>
<div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #166534; font-weight: 600;">{{ $remarks ?? 'All turnover procedures, condition checks, and equipment inspections have been successfully cleared.' }}</p>
</div>
<p>Thank you for your cooperation and for using Father Saturnino Urios University AVR facilities and equipment.</p>
@endif

@elseif(in_array($normStatus, ['requirements resubmitted', 'resubmitted requirements', 'resubmitted']))
<p style="font-size: 16px; font-weight: bold; color: #2563eb;">MISSING REQUIREMENTS RECEIVED — UNDER REVIEW</p>
<p>Good day, {{ $requestorName }}.</p>
<p>We have successfully received your re-uploaded requirement documents for {{ $itemType }} [<strong>{{ $ref }}</strong>].</p>
<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #1e40af; font-weight: 600;">{{ $remarks ?? 'Your reservation status has been updated to PENDING REVIEW. Our administrative staff will re-evaluate your submitted documents shortly.' }}</p>
</div>
<p>You can monitor the review progress at any time via the official tracking portal.</p>

@elseif(($type ?? 'venue') === 'equipment' && $normStatus === 'approved')
<div style="border-bottom: 2px solid #dcfce7; padding-bottom: 12px; margin-bottom: 16px;">
  <p style="font-size: 16px; font-weight: bold; color: #15803d; margin: 0;">EQUIPMENT BORROWING APPROVED</p>
  <span style="font-size: 12px; color: #64748b;">Father Saturnino Urios University &bull; AVR Custodial Services</span>
</div>
<p>Good day, <strong>{{ $requestorName }}</strong>.</p>
<p>Your equipment borrowing request has been <strong style="color: #15803d;">APPROVED</strong>! Please present your official reference code below at the AVR counter to claim your requested equipment units:</p>

<div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 10px; padding: 14px; text-align: center; margin: 18px 0;">
  <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #166534; letter-spacing: 1px;">Equipment Release Tracking Code</div>
  <div style="font-size: 24px; font-weight: 900; color: #15803d; letter-spacing: 2px; margin-top: 4px;">{{ $ref }}</div>
</div>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr>
      <td style="padding: 4px 0; color: #475569; font-weight: bold; width: 40%;">Borrow Schedule:</td>
      <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}</td>
    </tr>
    @if(!empty($remarks))
    <tr>
      <td style="padding: 4px 0; color: #475569; font-weight: bold;">Staff Remarks:</td>
      <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">{{ $remarks }}</td>
    </tr>
    @endif
  </table>
</div>

<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">
    📌 <strong>Pickup Requirements:</strong> Please proceed to the AVR counter and present your physical <strong>School ID</strong>. Reminder: Arrive at least 15 minutes before your scheduled start time.
  </p>
</div>

@elseif($normStatus === 'approved')
<p>Reminder: Please ensure you arrive at least 15 minutes before your scheduled start time.</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} (Reference: <strong>{{ $ref }}</strong>) has been approved!<br>
Scheduled date: {{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}.</p>

@elseif($normStatus === 'incomplete')
<p style="font-size: 16px; font-weight: bold; color: #d97706;">ACTION REQUIRED: MISSING REQUIREMENTS</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] has been reviewed and requires additional documents before it can be finalized.</p>
<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0 0 6px 0; font-weight: bold; color: #92400e;">Reviewer Remarks:</p>
  <p style="margin: 0; color: #78350f;">{{ $remarks ?? 'Missing required document(s)' }}</p>
  @if(!empty($booking->incomplete_deadline_at))
  <p style="margin: 8px 0 0 0; font-size: 12px; color: #b45309;">
    <strong>Submission Deadline:</strong> {{ \Carbon\Carbon::parse($booking->incomplete_deadline_at)->format('M d, Y h:i A') }} (Please upload missing files before this deadline to retain your reserved slot).
  </p>
  @endif
</div>
<p>You can upload your missing documents directly on the tracking portal:</p>
<p><a href="{{ $trackUrl }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Upload Missing Documents &rarr;</a></p>

@elseif(in_array($normStatus, ['urgent approval', 'urgent_approval']))
<p style="font-size: 16px; font-weight: bold; color: #ea580c;">🚨 URGENT APPROVAL EXPEDITED</p>
<p>Good day, {{ $requestorName }}.</p>
<p>An urgent approval notification has been expedited for your {{ $itemType }} [<strong>{{ $ref }}</strong>].</p>
<div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #9a3412; font-weight: 600;">{{ $remarks ?? 'An expedited Urgent Approval alert has been sent to Staff and Super Admin for rapid review.' }}</p>
</div>
<p>You can monitor real-time review progress at any time via the official tracking portal.</p>

@elseif(($type ?? 'venue') === 'equipment' && $normStatus === 'rejected')
<div style="border-bottom: 2px solid #fee2e2; padding-bottom: 12px; margin-bottom: 16px;">
  <p style="font-size: 16px; font-weight: bold; color: #dc2626; margin: 0;">EQUIPMENT BORROWING NOT APPROVED</p>
  <span style="font-size: 12px; color: #64748b;">Father Saturnino Urios University &bull; AVR Custodial Services</span>
</div>
<p>Good day, <strong>{{ $requestorName }}</strong>.</p>
<p>We regret to inform you that your equipment borrowing request (Reference: <strong>{{ $ref }}</strong>) was not approved.</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0 0 4px 0; font-weight: bold; color: #991b1b; font-size: 12px; text-transform: uppercase;">Reason / Custodial Remarks:</p>
  <p style="margin: 0; color: #7f1d1d; font-size: 13px;">{{ $remarks ?? 'Schedule conflict or requested equipment units currently unavailable.' }}</p>
</div>
<p style="font-size: 13px; color: #475569;">If you need assistance or wish to borrow alternative equipment items, please visit the AVR Office or file a new request.</p>

@elseif($normStatus === 'rejected')
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} (Reference: <strong>{{ $ref }}</strong>) was not approved.</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0 0 4px 0; font-weight: bold; color: #991b1b; font-size: 12px; text-transform: uppercase;">Reason:</p>
  <p style="margin: 0; color: #7f1d1d; font-size: 13px;">{{ $remarks ?? 'This request was not approved because another reservation for the same venue and time was approved first. Please submit a new reservation for a different venue or schedule.' }}</p>
</div>

@else
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} (Reference: <strong>{{ $ref }}</strong>) status has been updated to <strong>{{ ucfirst($status ?? 'updated') }}</strong>.</p>
@if(!empty($remarks))
<p>Remarks: {{ $remarks }}</p>
@endif
@endif

<div class="summary-block">
----------------------------------------<br>
Reference  : {{ $ref }}<br>
Type       : {{ ucfirst($type ?? 'venue') }}<br>
Status     : {{ ucfirst($status ?? 'pending') }}<br>
----------------------------------------
</div>

<p>You may track your request status here: <a href="{{ $trackUrl }}">{{ $trackUrl }}</a></p>

<p>If you have any questions or require assistance, please contact the System Administrator.</p>

@php
    $sysSettings = \App\Models\SystemSetting::getSettings();
@endphp
<p class="signoff">
Respectfully,<br>
<strong>{{ $sysSettings->system_name ?: 'System Administrator' }}</strong><br>
{{ $sysSettings->organization_name ?: 'Father Saturnino Urios University' }}<br>
@if(!empty($sysSettings->contact_phone)) Contact Phone: {{ $sysSettings->contact_phone }} &bull; @endif
@if(!empty($sysSettings->contact_email)) Email: <a href="mailto:{{ $sysSettings->contact_email }}" style="color: #2563eb;">{{ $sysSettings->contact_email }}</a> @endif
</p>
</body>
</html>
