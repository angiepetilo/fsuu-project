<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FSUU Status Notice</title>
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
      padding: 18px 24px;
      color: #ffffff;
    }
    .banner-default   { background-color: #0f172a; border-bottom: 3px solid #2563eb; }
    .banner-success   { background-color: #064e3b; border-bottom: 3px solid #10b981; }
    .banner-warning   { background-color: #78350f; border-bottom: 3px solid #f59e0b; }
    .banner-danger    { background-color: #7f1d1d; border-bottom: 3px solid #ef4444; }
    
    .top-banner .status-badge {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.18);
      margin-bottom: 6px;
    }
    .top-banner .banner-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.3px;
      margin: 0;
    }
    .top-banner .sub-title {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 4px;
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
    .ref-card-success { border-left-color: #10b981; background-color: #f0fdf4; }
    .ref-card-warning { border-left-color: #f59e0b; background-color: #fffbeb; }
    .ref-card-danger  { border-left-color: #ef4444; background-color: #fef2f2; }

    .ref-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
    }
    .ref-value {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 20px;
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
    .callout {
      border-radius: 6px;
      padding: 14px 16px;
      margin: 18px 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .callout-info    { background-color: #eff6ff; border-left: 4px solid #3b82f6; color: #1e40af; }
    .callout-success { background-color: #f0fdf4; border-left: 4px solid #10b981; color: #166534; }
    .callout-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; }
    .callout-danger  { background-color: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; }
    .callout-external{ background-color: #faf5ff; border-left: 4px solid #a855f7; color: #581c87; }

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
    $requestorName = $booking->filer_name 
        ?? $booking->requestor_name 
        ?? $booking->borrower_name 
        ?? trim(($booking->first_name ?? '') . ' ' . ($booking->last_name ?? '')) 
        ?: 'Requestor';

    $ref = $refCode ?? ($booking->reference_code ?? ($booking->trackingNumber?->reference_code ?? 'TRK-FSUU'));
    $venueName = $booking->venue?->name ?? 'AVR Facility';
    $venueLocation = $booking->venue?->location ?? 'Main Campus';
    $sched = $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time');
    $purpose = $booking->purpose ?? 'University Event';
    $persons = $booking->no_of_person ?? ($booking->number_of_persons ?? 'N/A');
    $baseUrl = rtrim(config('app.frontend_url') ?: env('FRONTEND_URL', 'https://fsuu-project.vercel.app'), '/');
    $trackUrl = $baseUrl . '/track?tracking=' . urlencode($ref);

    $classification = strtolower(trim((string)($booking->requestor_identity_type ?? $booking->classification ?? 'student')));
    $isExternal = str_contains($classification, 'external');
    $organization = $booking->program_office ?? $booking->department?->name ?? ($isExternal ? 'External Organization' : 'Department');

    $normStatus = strtolower(str_replace(['_', '-'], ' ', (string)($status ?? '')));

    // Terminal outcomes recorded at return inspection share the clearance-receipt layout,
    // but keep their own label/tone so a damaged/lost/late return is never shown as a clean clearance.
    $terminalOutcome = match (true) {
        in_array($normStatus, ['late return', 'late'], true) => 'late',
        $normStatus === 'damaged'                           => 'damaged',
        $normStatus === 'lost'                              => 'lost',
        default                                             => null,
    };
    if ($terminalOutcome) {
        $normStatus = 'completed';
    }
    $clearanceLabel = match ($terminalOutcome) {
        'late'    => 'CLEARED — LATE RETURN LOGGED',
        'damaged' => 'CLEARED — DAMAGE NOTED',
        'lost'    => 'INCOMPLETE — UNIT REPORTED LOST',
        default   => 'OFFICIALLY CLEARED',
    };
    $terminalBanner = match ($terminalOutcome) {
        'late'    => 'banner-warning',
        'damaged' => 'banner-warning',
        'lost'    => 'banner-danger',
        default   => 'banner-success',
    };
    $statusLabel = ucwords(str_replace(['_', '-'], ' ', (string)($status ?? 'updated')));
    $isVenue = ($type ?? 'venue') === 'venue';

    // Equipment items summary list
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

    // Resolve individual physical equipment units
    $assignedRaw = $booking->assigned_units ?? [];
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
            $dbUnits = \App\Models\EquipmentUnit::with(['equipmentType'])->where(function($q) use ($unitCodes, $numericIds) {
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
@endphp

<div class="wrapper">

{{-- =========================================================================
     BANNER SELECTION BASED ON STATUS
   ========================================================================= --}}
@if(in_array($normStatus, ['overdue', 'passed due', 'return past due notice', 'exceed end time', 'exceeded end time', 'overtime']))
  <div class="top-banner banner-danger">
    <div class="status-badge">Overdue / Action Required</div>
    <div class="banner-title">
      {{ $isVenue ? 'URGENT: Reservation Exceeded Scheduled End Time' : 'OVERDUE NOTICE: Equipment Return Required Immediately' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['cancelled', 'auto cancelled', 'auto-cancelled', 'auto_cancelled', 'rejected']))
  <div class="top-banner banner-danger">
    <div class="status-badge">Notice of Status</div>
    <div class="banner-title">
      {{ in_array($normStatus, ['rejected']) ? 'Reservation Request Not Approved' : 'Reservation Automatically Cancelled' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['completed', 'returned', 'done', 'cleared']))
  <div class="top-banner {{ $terminalBanner }}">
    <div class="status-badge">{{ $terminalOutcome ? 'Return Recorded — ' . ucfirst($terminalOutcome) : 'Official Clearance' }}</div>
    <div class="banner-title">
      {{ $isVenue ? 'Facility Turnover Completed &amp; Cleared' : 'Official Return Receipt &amp; Custodial Clearance' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['on going', 'on-going', 'ongoing', 'released', 'on_going']))
  <div class="top-banner banner-success">
    <div class="status-badge">Active Session / Custody Handover</div>
    <div class="banner-title">
      {{ $isVenue ? 'Event Check-In Logged — Session Now On-Going' : 'Custody Handover: Equipment Released &amp; Active' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['approved']))
  <div class="top-banner banner-success">
    <div class="status-badge">Confirmed &amp; Approved</div>
    <div class="banner-title">
      {{ $isVenue ? 'Venue Reservation Confirmed' : 'Equipment Borrowing Request Approved' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['reminder', 'due soon', 'due_soon', 'return reminder', 'return_reminder']))
  <div class="top-banner banner-warning">
    <div class="status-badge">Schedule Reminder</div>
    <div class="banner-title">
      {{ $isVenue ? 'Reminder: Event Scheduled for Today' : 'Reminder: Upcoming Equipment Return Deadline' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['incomplete', 'missing requirements']))
  <div class="top-banner banner-warning">
    <div class="status-badge">Action Required</div>
    <div class="banner-title">Missing Documentation Required for Review</div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@else
  <div class="top-banner banner-default">
    <div class="status-badge">Status Update</div>
    <div class="banner-title">Reservation Status: {{ $statusLabel }}</div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>
@endif

  <div class="content">

{{-- =========================================================================
     1. OVERDUE / PAST DUE / OVERTIME
   ========================================================================= --}}
@if(in_array($normStatus, ['overdue', 'passed due', 'return past due notice']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue)
    <p>The scheduled return time for the equipment units issued under Reference <strong>{{ $ref }}</strong> has passed. These items are officially marked as <strong>PAST DUE</strong>.</p>
    
    <div class="ref-card ref-card-danger">
      <div class="ref-label">Overdue Reference</div>
      <div class="ref-value" style="color: #991b1b;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #7f1d1d; margin-top: 4px;">
        Scheduled Return Deadline: {{ $sched }}
      </div>
    </div>

    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
          Unreturned Physical Equipment Units:
        </div>
        @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release'])
      </div>
    @endif

    @if($isExternal)
      <!-- External Client Overdue Advisory -->
      <div class="callout callout-danger">
        <strong style="display:block; margin-bottom: 4px;">⚠️ Immediate Action Required (External Client Accountability):</strong>
        <div>1. Return all equipment units and bundled accessories to the AVR Custodial Counter immediately (Main Building 2nd Floor).</div>
        <div style="margin-top: 4px;">2. <strong>Financial Liability:</strong> As an external client, past-due borrowings incur hourly rental penalties per the university Fee Matrix and may result in the forfeiture of your security deposit.</div>
        <div style="margin-top: 4px;">3. Unreturned university property is escalated to the University Legal and Accounting Offices for property recovery.</div>
      </div>
    @else
      <!-- Internal Member Overdue Advisory -->
      <div class="callout callout-danger">
        <strong style="display:block; margin-bottom: 4px;">⚠️ Immediate Action Required:</strong>
        <div>Please return all borrowed units to the AVR Custodial Counter immediately. Unreturned gear disrupts other scheduled academic classes. Failure to return items before the daily counter cutoff freezes student/faculty borrowing privileges and initiates an administrative clearance hold.</div>
      </div>
    @endif

  @else
    {{-- Venue Past Due / Overtime --}}
    <p>Your scheduled timeslot for <strong>{{ $venueName }}</strong> (Reference: <strong>{{ $ref }}</strong>) has exceeded its scheduled end time.</p>
    
    <div class="ref-card ref-card-danger">
      <div class="ref-label">Exceeded Venue Timeslot</div>
      <div class="ref-value" style="color: #991b1b;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #7f1d1d; margin-top: 4px;">
        Scheduled Session: {{ $sched }}
      </div>
    </div>

    @if($isExternal)
      <div class="callout callout-danger">
        <strong style="display:block; margin-bottom: 4px;">⚠️ Venue Overtime Penalty Notice (External Organization):</strong>
        <div>1. Conclude your event and direct attendees to exit immediately.</div>
        <div style="margin-top: 4px;">2. Continued overtime usage is billed at the hourly overtime venue rate specified in the university rate matrix, deducted from the event security deposit.</div>
        <div style="margin-top: 4px;">3. Notify the AVR custodian on duty to conduct room inspection and sign off on room turnover.</div>
      </div>
    @else
      <div class="callout callout-danger">
        <strong style="display:block; margin-bottom: 4px;">⚠️ Urgent Room Turnover Required:</strong>
        <div>Please conclude your event immediately. Turn off lights, projectors, and air conditioning units, and vacate the premises for room sanitization and subsequent scheduled university reservations.</div>
      </div>
    @endif
  @endif

{{-- =========================================================================
     2. RELEASED / ON-GOING (CUSTODY HANDOVER / LIVE SESSION)
   ========================================================================= --}}
@elseif(in_array($normStatus, ['on going', 'on-going', 'ongoing', 'released', 'on_going']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue)
    <p>The equipment items listed below have been inspected, scanned, and officially handed over to your custody. You are accountable for each unit until returned and signed off.</p>

    <div class="ref-card ref-card-success">
      <div class="ref-label">
        Custody Handover Reference
        @if($isExternal)
          <span class="badge-external">External Custody</span>
        @else
          <span class="badge-internal">FSUU Custody</span>
        @endif
      </div>
      <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
        STRICT RETURN DEADLINE: {{ $sched }}
      </div>
    </div>

    <div style="margin: 16px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
        Scanned Units Handed Over:
      </div>
      @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release'])
    </div>

    @if($isExternal)
      <div class="callout callout-external">
        <strong style="display:block; margin-bottom: 4px;">📌 External Borrower Accountability Protocol:</strong>
        <div>&bull; <strong>Premises Restriction:</strong> All equipment must remain inside the assigned campus facility at all times. Bringing units outside university gates is strictly prohibited.</div>
        <div style="margin-top: 4px;">&bull; <strong>Return Inspection:</strong> Return units to the AVR desk at least 15 minutes before counter closing (5:00 PM) for accessory and functionality verification.</div>
      </div>
    @else
      <div class="callout callout-warning">
        <strong style="display:block; margin-bottom: 4px;">⏰ Return Reminder:</strong>
        <div>Please return all units, power adapters, HDMI cables, and carrying cases on or before <strong>{{ $sched }}</strong>. In case of emergency schedule adjustments, notify the counter immediately at Local 214.</div>
      </div>
    @endif

  @else
    {{-- Venue On-Going / Check-In --}}
    <p>Your event check-in for <strong>{{ $venueName }}</strong> has been recorded. The facility is officially turned over to your organization for the duration of your schedule.</p>

    <div class="ref-card ref-card-success">
      <div class="ref-label">Active Venue Session</div>
      <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
        Scheduled Period: {{ $sched }}
      </div>
    </div>

    <table class="data-table">
      <tr>
        <td class="data-label">Venue:</td>
        <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td class="data-label">{{ $isExternal ? 'Organization:' : 'Department:' }}</td>
        <td class="data-value">{{ $organization }}</td>
      </tr>
      <tr>
        <td class="data-label">Event Purpose:</td>
        <td class="data-value">{{ $purpose }}</td>
      </tr>
    </table>

    <div class="callout callout-info">
      <strong style="display:block; margin-bottom: 4px;">🏛️ Operational Guidelines During Event:</strong>
      <div>&bull; Keep emergency exits and fire doors unobstructed.</div>
      <div>&bull; Maintain audio volume within campus sound ordinance levels.</div>
      <div>&bull; Conclude activities promptly at your scheduled end time to allow room cleanup.</div>
    </div>
  @endif

{{-- =========================================================================
     3. COMPLETED / RETURNED / CLEARED
   ========================================================================= --}}
@elseif(in_array($normStatus, ['completed', 'returned', 'done', 'cleared']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue && $resolvedUnits->isNotEmpty())
    <p>All borrowed equipment units under Reference <strong>{{ $ref }}</strong> have been returned, tested, and inspected by the custodial staff.</p>

    <div class="ref-card ref-card-success">
      <div class="ref-label">
        Custodial Clearance Certificate
        @if($isExternal)
          <span class="badge-external">External Cleared</span>
        @else
          <span class="badge-internal">FSUU Cleared</span>
        @endif
      </div>
      <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
        STATUS: {{ $clearanceLabel }} &bull; {{ now()->format('M d, Y h:i A') }}
      </div>
    </div>

    <div style="margin: 16px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
        Returned Unit Inspection Record:
      </div>
      @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt'])
    </div>

    @if(!empty($remarks))
      <div class="callout callout-info">
        <strong style="display:block; margin-bottom: 2px;">Custodial Remarks / Inspection Notes:</strong>
        <div>{{ $remarks }}</div>
      </div>
    @endif

    @if($isExternal)
      <div class="callout callout-external">
        <strong style="display:block; margin-bottom: 4px;">🏢 External Account Clearance Notice:</strong>
        <div>This digital receipt certifies that all institutional assets loaned to {{ $organization }} have been restored to university inventory. You may present this notice to the Cashier / Accounting Office for security deposit release endorsement.</div>
      </div>
    @else
      <p style="font-size: 13px; color: #475569; font-style: italic;">
        Your custodial accountability record for this borrowing transaction is officially closed in good standing.
      </p>
    @endif

  @else
    {{-- Venue Completed or General Completion --}}
    <p>Your booking for <strong>{{ $venueName }}</strong> (Reference: <strong>{{ $ref }}</strong>) has concluded and the post-event turnover inspection has been completed.</p>

    <div class="ref-card ref-card-success">
      <div class="ref-label">Facility Clearance Record</div>
      <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
        Facility Cleared &amp; Restored &bull; {{ now()->format('M d, Y h:i A') }}
      </div>
    </div>

    @if(!empty($remarks))
      <div class="callout callout-info">
        <strong style="display:block; margin-bottom: 2px;">Turnover Remarks:</strong>
        <div>{{ $remarks }}</div>
      </div>
    @endif

    @if($isExternal)
      <div class="callout callout-external">
        <strong style="display:block; margin-bottom: 4px;">🏢 Security Deposit &amp; Exit Clearance:</strong>
        <div>The facility inspection confirmed the room was returned clean and undamaged. This serves as official clearance for the event security deposit and campus gate exit for any outside production materials.</div>
      </div>
    @else
      <p style="font-size: 13px; color: #475569;">
        Thank you for leaving the facility clean, orderly, and secured for the next university group.
      </p>
    @endif
  @endif

{{-- =========================================================================
     4. APPROVED
   ========================================================================= --}}
@elseif($normStatus === 'approved')
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue)
    {{-- Equipment Approved --}}
    <p>Your equipment borrowing request has been approved. The gear has been earmarked for your schedule at the AVR counter.</p>

    <div class="ref-card ref-card-success">
      <div class="ref-label">
        Claim Tracking Code
        @if($isExternal)
          <span class="badge-external">External Approved</span>
        @else
          <span class="badge-internal">FSUU Approved</span>
        @endif
      </div>
      <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
        Schedule: {{ $sched }}
      </div>
    </div>

    @if(!empty($equipmentList))
      <div style="margin: 14px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">Approved Items:</div>
        @foreach($equipmentList as $eqItem)
          <div style="font-size: 13px; color: #0f172a;">&bull; {{ $eqItem }}</div>
        @endforeach
      </div>
    @endif

    @if($isExternal)
      <div class="callout callout-external">
        <strong style="display:block; margin-bottom: 4px;">📌 External Pickup Instructions:</strong>
        <div>1. Report to the AVR Custodial Counter (Main Building, 2nd Floor).</div>
        <div style="margin-top: 4px;">2. Present your original <strong>Government-Issued Photo ID</strong> or Company ID along with Reference Code <strong>{{ $ref }}</strong>.</div>
        <div style="margin-top: 4px;">3. If rental charges apply, ensure the Cashier Official Receipt (O.R.) is presented before units are released.</div>
        <div style="margin-top: 4px;">4. Inspect and test all accessories (adapters, remotes, cords) before signing custody transfer.</div>
      </div>
    @else
      <div class="callout callout-info">
        <strong style="display:block; margin-bottom: 4px;">📌 Counter Claim Protocols:</strong>
        <div>&bull; Proceed to the AVR Custodial Counter (Main Building, 2nd Floor).</div>
        <div>&bull; Present your physical <strong>FSUU School ID</strong> and Reference Code: <strong>{{ $ref }}</strong>.</div>
        <div>&bull; Arrive 15 minutes before your schedule to complete barcode scanning and power check.</div>
      </div>
    @endif

  @else
    {{-- Venue Approved --}}
    <p>Your reservation request for <strong>{{ $venueName }}</strong> is confirmed and locked on the university calendar.</p>

    <div class="ref-card ref-card-success">
      <div class="ref-label">
        Confirmed Reservation
        @if($isExternal)
          <span class="badge-external">External Reservation</span>
        @else
          <span class="badge-internal">FSUU Approved</span>
        @endif
      </div>
      <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
        Schedule: {{ $sched }}
      </div>
    </div>

    <table class="data-table">
      <tr>
        <td class="data-label">Reserved Facility:</td>
        <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
      </tr>
      <tr>
        <td class="data-label">Organizer:</td>
        <td class="data-value">{{ $requestorName }} ({{ $organization }})</td>
      </tr>
      <tr>
        <td class="data-label">Event Purpose:</td>
        <td class="data-value">{{ $purpose }}</td>
      </tr>
      <tr>
        <td class="data-label">Expected Pax:</td>
        <td class="data-value">{{ $persons }} attendees</td>
      </tr>
      @if(!empty($equipmentList))
      <tr>
        <td class="data-label">Bundled AV Gear:</td>
        <td class="data-value">{{ implode(', ', $equipmentList) }}</td>
      </tr>
      @endif
    </table>

    @if($isExternal)
      <div class="callout callout-external">
        <strong style="display:block; margin-bottom: 4px;">🏢 External Client Settlement &amp; Ingress:</strong>
        <div>1. <strong>Cashier Payment:</strong> Pay the venue rental and utility fees at the FSUU Cashier (Main Building Ground Floor). Present the Official Receipt (O.R.) to the AVR office.</div>
        <div style="margin-top: 4px;">2. <strong>Security Gate Pass:</strong> Present this reference code at the main security gate for guest visitor access and vehicle parking passes.</div>
        <div style="margin-top: 4px;">3. <strong>Photo ID:</strong> The authorized organizer must present a valid Government Photo ID upon room turnover.</div>
      </div>
    @else
      <div class="callout callout-info">
        <strong style="display:block; margin-bottom: 4px;">🏛️ Room Access &amp; Keys:</strong>
        <div>&bull; Meet the AVR custodian or report to the counter 15 minutes before start time with your physical <strong>FSUU School ID</strong> to receive room keys and equipment remotes.</div>
        <div>&bull; Ensure the venue is left clean and secured after use.</div>
      </div>
    @endif
  @endif

{{-- =========================================================================
     5. REMINDER (DUE SOON / UPCOMING EVENT)
   ========================================================================= --}}
@elseif(in_array($normStatus, ['reminder', 'due soon', 'due_soon', 'return reminder', 'return_reminder']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue)
    <p>This is a reminder that the equipment units borrowed under Reference <strong>{{ $ref }}</strong> are due back at the AVR Counter shortly.</p>

    <div class="ref-card ref-card-warning">
      <div class="ref-label">Return Deadline</div>
      <div class="ref-value" style="color: #92400e;">{{ $sched }}</div>
    </div>

    <div class="callout callout-warning">
      <strong style="display:block; margin-bottom: 4px;">📦 Checklist for Return:</strong>
      <div>[ ] Microphones turned off and placed in designated pouch</div>
      <div>[ ] Power adapters, HDMI cables, and extension cords coiled</div>
      <div>[ ] Projector remotes and lens caps secured</div>
      <div style="margin-top: 6px;">Return Counter: AVR Custodial Desk (2nd Floor Main Building) &bull; Closes at 5:00 PM.</div>
    </div>

  @else
    <p>This is an operational reminder that your reservation for <strong>{{ $venueName }}</strong> is scheduled for today.</p>

    <div class="ref-card ref-card-warning">
      <div class="ref-label">Event Schedule</div>
      <div class="ref-value" style="color: #92400e;">{{ $sched }}</div>
    </div>

    <div class="callout callout-info">
      <strong style="display:block; margin-bottom: 4px;">⏰ Arrival &amp; Setup:</strong>
      <div>&bull; Room unlocks 15–30 minutes before your scheduled start time.</div>
      <div>&bull; Present your {{ $isExternal ? 'Government ID and Cashier O.R.' : 'FSUU School ID' }} to the custodian on duty.</div>
    </div>
  @endif

{{-- =========================================================================
     6. INCOMPLETE REQUIREMENTS
   ========================================================================= --}}
@elseif(in_array($normStatus, ['incomplete', 'missing requirements']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>
  <p>Our office reviewed your reservation request [<strong>{{ $ref }}</strong>]. We cannot finalize approval yet because additional documents or signatures are required.</p>

  <div class="ref-card ref-card-warning">
    <div class="ref-label">Action Required &bull; Pending Requirements</div>
    <div class="ref-value" style="color: #b45309;">{{ $ref }}</div>
  </div>

  <div class="callout callout-warning">
    <strong style="display:block; margin-bottom: 4px;">Reviewer Notes:</strong>
    <div>{{ $remarks ?? 'Missing required document(s) or signatures.' }}</div>
    @if(!empty($booking->incomplete_deadline_at))
      <div style="margin-top: 8px; font-weight: 700; color: #78350f;">
        Submission Cutoff: {{ \Carbon\Carbon::parse($booking->incomplete_deadline_at)->format('M d, Y h:i A') }}
      </div>
    @endif
  </div>

  <div style="text-align: center; margin: 20px 0;">
    <a href="{{ $trackUrl }}" class="track-btn" style="background-color: #2563eb;">Upload Missing Documents Online &rarr;</a>
  </div>

{{-- =========================================================================
     7. REJECTED / CANCELLED
   ========================================================================= --}}
@elseif(in_array($normStatus, ['rejected', 'cancelled', 'auto cancelled', 'auto-cancelled', 'auto_cancelled']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(in_array($normStatus, ['rejected']))
    <p>Your request for {{ $isVenue ? $venueName : 'equipment borrowing' }} under Reference <strong>{{ $ref }}</strong> was not approved.</p>

    <div class="callout callout-danger">
      <strong style="display:block; margin-bottom: 2px;">Reason / Administrative Remarks:</strong>
      <div>{{ $remarks ?? 'Schedule conflict with university academic calendar or equipment units currently scheduled for maintenance.' }}</div>
    </div>

    <p style="font-size: 13px; color: #475569;">
      If you wish to explore alternative dates or venues, please visit the AVR Office or submit a new request with an adjusted timeslot.
    </p>

  @else
    {{-- Auto-cancelled / Cancelled --}}
    <p>Your reservation for {{ $isVenue ? $venueName : 'equipment borrowing' }} [<strong>{{ $ref }}</strong>] scheduled for {{ $sched }} has been cancelled.</p>

    <div class="callout callout-danger">
      <strong style="display:block; margin-bottom: 2px;">Cancellation Notice:</strong>
      <div>{{ $remarks ?? 'The scheduled start time and auto-cancel threshold elapsed without check-in or equipment collection.' }}</div>
    </div>

    <p style="font-size: 13px; color: #475569;">
      The reserved timeslot or equipment items have been released back to the general university calendar.
    </p>
  @endif

{{-- =========================================================================
     8. DEFAULT / FALLBACK STATUS
   ========================================================================= --}}
@else
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>
  <p>The status of your {{ $isVenue ? 'venue reservation' : 'equipment borrowing' }} [<strong>{{ $ref }}</strong>] has been updated to: <strong>{{ $statusLabel }}</strong>.</p>

  @if(!empty($remarks))
    <div class="callout callout-info">
      <strong style="display:block; margin-bottom: 2px;">Staff Remarks:</strong>
      <div>{{ $remarks }}</div>
    </div>
  @endif

  <table class="data-table">
    <tr>
      <td class="data-label">Reference:</td>
      <td class="data-value" style="font-family: monospace; font-weight: 700;">{{ $ref }}</td>
    </tr>
    <tr>
      <td class="data-label">Schedule:</td>
      <td class="data-value">{{ $sched }}</td>
    </tr>
    <tr>
      <td class="data-label">Current Status:</td>
      <td class="data-value"><strong>{{ $statusLabel }}</strong></td>
    </tr>
  </table>
@endif

    <div style="text-align: center; margin-top: 24px;">
      <a href="{{ $trackUrl }}" class="track-btn">Track Status Online &rarr;</a>
    </div>

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
