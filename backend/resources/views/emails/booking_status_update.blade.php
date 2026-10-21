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
    .gatepass-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #15803d;
      margin: 0;
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
      margin-top: 4px;
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

    $applicantEmail = $booking->email_address ?? $booking->email ?? $booking->borrower_email ?? $booking->requestor_email ?? 'N/A';
    $applicantPhone = $booking->contact_number ?? $booking->phone_number ?? $booking->phone ?? 'N/A';
    $applicantIdentity = ucwords($booking->classification ?? $booking->requestor_identity_type ?? 'Student');

    // Date & time used (check-in / claimed / start of usage)
    $dateUsedRaw = $booking->claim_timestamp 
        ?? ($booking->date_of_usage ? ($booking->date_of_usage . ' ' . ($booking->time_start ?? '08:00:00')) : null)
        ?? $booking->created_at;
    $dateUsedFormatted = $sched;
    try {
        if ($dateUsedRaw) {
            $dateUsedFormatted = \Carbon\Carbon::parse($dateUsedRaw)->format('M d, Y h:i A');
        }
    } catch (\Throwable $e) {}

    // Date & time returned (returned_at / inspection / conclusion)
    $dateReturnedRaw = $booking->returned_at 
        ?? ($booking->inspections?->first()?->inspected_at ?? null)
        ?? now();
    $dateReturnedFormatted = now()->format('M d, Y h:i A');
    try {
        if ($dateReturnedRaw) {
            $dateReturnedFormatted = \Carbon\Carbon::parse($dateReturnedRaw)->format('M d, Y h:i A');
        }
    } catch (\Throwable $e) {}

    // Resolve Staff user who released the equipment or logged venue check-in
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

    $normStatus = strtolower(str_replace(['_', '-'], ' ', (string)($status ?? '')));

    // Terminal outcomes recorded at return inspection share the clearance-receipt layout,
    // but ONLY when the transaction is actually completed / returned by custodial staff.
    $isActuallyCompleted = in_array(strtolower((string)($booking->status ?? $booking->trackingNumber?->status ?? '')), ['completed', 'returned', 'done', 'cleared']);
    $terminalOutcome = null;
    if ($isActuallyCompleted) {
        $terminalOutcome = match (true) {
            in_array($normStatus, ['late return', 'late', 'late_return'], true) => 'late',
            $normStatus === 'damaged'                                           => 'damaged',
            $normStatus === 'lost'                                              => 'lost',
            default                                                             => null,
        };
        if ($terminalOutcome) {
            $normStatus = 'completed';
        }
    }
    $clearanceLabel = match ($terminalOutcome) {
        'late'    => 'CLEARED — LATE RETURN LOGGED',
        'damaged' => 'CLEARED — DAMAGE NOTED',
        'lost'    => 'INCOMPLETE — UNIT REPORTED LOST',
        default   => 'OFFICIALLY CLEARED & RETURNED',
    };
    $terminalBanner = match ($terminalOutcome) {
        'late'    => 'banner-warning',
        'damaged' => 'banner-warning',
        'lost'    => 'banner-danger',
        default   => 'banner-success',
    };
    $statusLabel = ucwords(str_replace(['_', '-'], ' ', (string)($status ?? 'updated')));
    $isVenue = ($type ?? 'venue') === 'venue';

    // Equipment items summary list with built-ins
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

    // Fallback: check inspections or equipment_units column if assigned_units is empty
    if (empty($assignedRaw) || (is_array($assignedRaw) && empty(array_filter($assignedRaw)))) {
        try {
            $inspAssigned = \App\Models\Inspection::where(function($q) use ($booking) {
                $q->where('inspectable_id', $booking->id)
                  ->where(function($sq) {
                      $sq->where('inspectable_type', 'venue_booking')
                         ->orWhere('inspectable_type', 'avr_venue_booking')
                         ->orWhere('inspectable_type', 'venue')
                         ->orWhere('inspectable_type', 'equipment_borrow')
                         ->orWhere('inspectable_type', 'equipment_borrowing');
                  });
            })->orWhere(function($q) use ($booking) {
                $q->where('reference_id', $booking->id)
                  ->where(function($sq) {
                      $sq->where('reference_type', 'venue_booking')
                         ->orWhere('reference_type', 'avr_venue_booking');
                  });
            })->latest('id')->value('assigned_units');

            if (!empty($inspAssigned)) {
                if (is_string($inspAssigned)) {
                    try { $inspAssigned = json_decode($inspAssigned, true); } catch (\Throwable $t) {}
                }
                if (is_array($inspAssigned) && !empty($inspAssigned)) {
                    $assignedRaw = $inspAssigned;
                }
            }
        } catch (\Throwable $e) {}
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
                $q->whereIn('barcode', $unitCodes)
                  ->orWhereIn('serial_number', $unitCodes);
                if (!empty($numericIds)) { $q->orWhereIn('id', array_map('intval', $numericIds)); }
            })->get();
            $resolvedUnits = $dbUnits->map(function ($unit) use ($unitCondMap, $assignedRaw) {
                $key = $unit->barcode ?? $unit->serial_number;
                $foundCond = $unitCondMap[$key] ?? null;
                if (!$foundCond) {
                    foreach ((array)$assignedRaw as $idx => $bc) {
                        $bcStr = is_string($bc) ? $bc : (is_array($bc) ? ($bc['barcode'] ?? $bc['serial_number'] ?? '') : '');
                        if ((string)$bcStr === (string)$key && isset($unitCondMap[$idx])) {
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

            // Ensure any barcodes passed in assigned_units that weren't in dbUnits still render
            $foundBarcodes = [];
            foreach ($resolvedUnits as $ru) {
                if ($ru->barcode) $foundBarcodes[] = (string)$ru->barcode;
                if ($ru->serial_number) $foundBarcodes[] = (string)$ru->serial_number;
                if ($ru->id) $foundBarcodes[] = (string)$ru->id;
            }
            foreach ($unitCodes as $uc) {
                $ucStr = (string)$uc;
                if (!in_array($ucStr, $foundBarcodes, true)) {
                    $resolvedUnits->push((object)[
                        'id' => is_numeric($ucStr) ? (int)$ucStr : null,
                        'barcode' => $ucStr,
                        'serial_number' => $ucStr,
                        'seq_no' => null,
                        'brand' => null,
                        'model' => null,
                        'condition' => 'Good',
                        'equipmentType' => null,
                    ]);
                    $foundBarcodes[] = $ucStr;
                }
            }
        } catch (\Throwable $e) {}
    }

    // Rule: Campus Gate Pass applies if:
    // 1. For Equipment Borrowing: ONLY when unique physical equipment units with serial numbers are together with it ($resolvedUnits->isNotEmpty()).
    //    An equipment borrowing that was only approved WITHOUT unique units will NOT show a gate pass.
    // 2. For Venue Reservation: External client ($isExternal) OR venue reservation that has unique equipment units assigned ($resolvedUnits->isNotEmpty()).
    if (!$isVenue) {
        $hasGatePass = $resolvedUnits->isNotEmpty();
    } else {
        $hasGatePass = $isExternal || $resolvedUnits->isNotEmpty();
    }
@endphp

<div class="wrapper">

{{-- =========================================================================
     BANNER SELECTION BASED ON STATUS
   ========================================================================= --}}
@if(in_array($normStatus, ['overdue', 'passed due', 'past due', 'past_due', 'return past due notice', 'exceed end time', 'exceeded end time', 'overtime', 'late return', 'late_return', 'late']))
  <div class="top-banner banner-danger">
    <div class="status-badge">{{ $isVenue ? 'Past Due / Action Required' : 'Late Return / Action Required' }}</div>
    <div class="banner-title">
      {{ $isVenue ? 'PAST DUE NOTICE: Venue Reservation Exceeded Scheduled End Time' : 'NOTICE OF LATE RETURN: Equipment Return Required Immediately' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['cancelled', 'auto cancelled', 'auto-cancelled', 'auto_cancelled', 'rejected']))
  <div class="top-banner banner-danger">
    <div class="status-badge">Notice of Status</div>
    <div class="banner-title">
      {{ in_array($normStatus, ['rejected']) ? 'Reservation Request Not Approved' : ($isVenue ? 'Venue Reservation Cancelled' : 'Equipment Borrowing Cancelled') }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center</div>
  </div>

@elseif(in_array($normStatus, ['completed', 'returned', 'done', 'cleared']))
  <div class="top-banner {{ $terminalBanner }}">
    <div class="status-badge">{{ $terminalOutcome ? 'Return Recorded — ' . ucfirst($terminalOutcome) : 'Official Clearance Return Receipt' }}</div>
    <div class="banner-title">
      {{ $isVenue ? 'Facility Turnover Completed Cleared' : 'Official Return Receipt Custodial Clearance' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR / PMO)</div>
  </div>

@elseif(in_array($normStatus, ['on going', 'on-going', 'ongoing', 'released', 'on_going']))
  <div class="top-banner banner-success">
    <div class="status-badge">Active Session / Custody Handover</div>
    <div class="banner-title">
      {{ $isVenue ? 'Event Check-In Logged — Session Now On-Going' : 'Custody Handover: Equipment Released Active' }}
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center (AVR / PMO)</div>
  </div>

@elseif(in_array($normStatus, ['approved']))
  <div class="top-banner banner-success">
    <div class="status-badge">{{ $hasGatePass ? 'Approved • Official Gate Pass' : 'Approved • Reservation Confirmed' }}</div>
    <div class="banner-title">
      @if($hasGatePass)
        {!! $isVenue ? 'Venue Reservation Approved &amp; Campus Gate Pass' : 'Equipment Borrowing Approved &amp; Campus Gate Pass' !!}
      @else
        {!! $isVenue ? 'Venue Reservation Confirmed' : 'Equipment Borrowing Approved' !!}
      @endif
    </div>
    <div class="sub-title">Father Saturnino Urios University &bull; Audio-Visual Resource Center &bull; Physical Plant / PMO</div>
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
@if(in_array($normStatus, ['overdue', 'passed due', 'past due', 'past_due', 'return past due notice', 'exceed end time', 'exceeded end time', 'overtime', 'late return', 'late_return', 'late']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue)
    <p>The scheduled return time for the equipment units issued under Reference <strong>{{ $ref }}</strong> has passed. This borrowing transaction is officially marked as <strong>LATE RETURN</strong>.</p>
    
    <div class="ref-card ref-card-danger">
      <div class="ref-label">Late Return Notice</div>
      <div class="ref-value" style="color: #991b1b;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #7f1d1d; margin-top: 4px;">
        Scheduled Return Deadline: {{ $sched }}
      </div>
      @if(!empty($releasedByName))
        <div style="font-size: 12px; font-weight: 700; color: #991b1b; margin-top: 6px; border-top: 1px dashed #fca5a5; padding-top: 6px;">
          Released by: <span style="color: #7f1d1d;">{{ $releasedByName }}</span> (AVR Custodial Staff)
        </div>
      @endif
    </div>

    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
          Unreturned Physical Equipment Units:
        </div>
        @include('emails.partials.equipment_unit_table', [
          'units' => $resolvedUnits,
          'mode' => 'late_cards',
          'equipmentList' => $equipmentList ?? [],
          'booking' => $booking ?? null,
          'releasedByName' => $releasedByName ?? null
        ])
      </div>
    @endif

    @if($isExternal)
      <!-- External Client Overdue Advisory -->
      <div class="callout callout-danger">
        <strong style="display:block; margin-bottom: 4px;">⚠️ Immediate Action Required (External Client Accountability):</strong>
        <div>1. Return all equipment units and bundled accessories to the AVR Custodial Counter immediately (Main Building 2nd Floor).</div>
        <div style="margin-top: 4px;">2. <strong>Financial Liability:</strong> As an external client, late equipment returns incur hourly rental penalties per the university Fee Matrix and may result in the forfeiture of your security deposit.</div>
        <div style="margin-top: 4px;">3. Unreturned university property is escalated to the University Legal and Accounting Offices for property recovery.</div>
      </div>
    @else
      <!-- Internal Member Overdue Advisory -->
      <div class="callout callout-danger">
        <strong style="display:block; margin-bottom: 4px;">⚠️ Immediate Action Required:</strong>
        <div>Please return all borrowed units to the AVR Custodial Counter immediately. Unreturned gear disrupts other scheduled academic classes. Failure to return items promptly freezes student/faculty borrowing privileges and initiates an administrative clearance hold.</div>
      </div>
    @endif

  @else
    {{-- Venue Past Due / Overtime --}}
    <p>Your scheduled timeslot for <strong>{{ $venueName }}</strong> (Reference: <strong>{{ $ref }}</strong>) has exceeded its scheduled end time and is officially marked as <strong>PAST DUE</strong>.</p>
    
    <div class="ref-card ref-card-danger">
      <div class="ref-label">Past Due Venue Reservation</div>
      <div class="ref-value" style="color: #991b1b;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #7f1d1d; margin-top: 4px;">
        Scheduled Session: {{ $sched }}
      </div>
      @if(!empty($releasedByName))
        <div style="font-size: 12px; font-weight: 700; color: #991b1b; margin-top: 6px; border-top: 1px dashed #fca5a5; padding-top: 6px;">
          Check-in Logged by: <span style="color: #7f1d1d;">{{ $releasedByName }}</span> (AVR Staff)
        </div>
      @endif
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

    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
          Assigned Venue Equipment Units Due for Turnover (Seq No., Serial No., Brand &amp; Model):
        </div>
        @include('emails.partials.equipment_unit_table', [
          'units' => $resolvedUnits,
          'mode' => 'late_cards',
          'equipmentList' => $equipmentList ?? [],
          'booking' => $booking ?? null,
          'releasedByName' => $releasedByName ?? null
        ])
      </div>
    @endif

    @if(!empty($remarks))
      <div class="callout callout-danger" style="margin: 14px 0;">
        <strong style="display:block; margin-bottom: 2px;">⚠️ AVR Operations Notice:</strong>
        <div>{{ $remarks }}</div>
      </div>
    @endif

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
      @if(!empty($releasedByName))
        <div style="font-size: 12px; font-weight: 700; color: #166534; margin-top: 6px; border-top: 1px dashed #86efac; padding-top: 6px;">
          Released by: <span style="color: #14532d;">{{ $releasedByName }}</span> (AVR Custodial Staff)
        </div>
      @endif
    </div>

    <div style="margin: 16px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
        Scanned Units Handed Over:
      </div>
      @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
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
      @if(!empty($releasedByName))
        <div style="font-size: 12px; font-weight: 700; color: #166534; margin-top: 6px; border-top: 1px dashed #86efac; padding-top: 6px;">
          Check-in Logged by: <span style="color: #14532d;">{{ $releasedByName }}</span> (AVR Staff)
        </div>
      @endif
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

    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
          Assigned Venue Equipment Units (Seq No., Serial No., Brand &amp; Model):
        </div>
        @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
      </div>
    @elseif(!empty($equipmentList))
      <div style="margin: 14px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">Requested Venue Equipment:</div>
        @foreach($equipmentList as $eqItem)
          @php
            $itemLabel = is_array($eqItem) ? ($eqItem['label'] ?? ($eqItem['name'] ?? 'Equipment Item')) : $eqItem;
            $builtIns = is_array($eqItem) ? ($eqItem['built_ins'] ?? []) : [];
          @endphp
          <div style="font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            <div>&bull; <strong>{{ $itemLabel }}</strong></div>
            @if(!empty($builtIns) && count($builtIns) > 0)
              <div style="margin-left: 14px; margin-top: 2px; font-size: 11.5px; color: #475569;">
                <span style="font-weight: 700; color: #2563eb;">Built-in:</span>
                @foreach($builtIns as $bName)
                  <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 6px; font-size: 10.5px; font-weight: 700; margin: 1px 2px;">{{ $bName }}</span>
                @endforeach
              </div>
            @endif
          </div>
        @endforeach
      </div>
    @endif

    <div class="callout callout-info">
      <strong style="display:block; margin-bottom: 4px;">🏛️ Operational Guidelines During Event:</strong>
      <div>&bull; Keep emergency exits and fire doors unobstructed.</div>
      <div>&bull; Maintain audio volume within campus sound ordinance levels.</div>
      <div>&bull; Conclude activities promptly at your scheduled end time to allow room cleanup.</div>
    </div>
  @endif

{{-- =========================================================================
     3. COMPLETED / RETURNED / CLEARED (OFFICIAL RETURN RECEIPT)
   ========================================================================= --}}
@elseif(in_array($normStatus, ['completed', 'returned', 'done', 'cleared']))
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  <p>
    Your {{ $isVenue ? 'venue booking for ' . $venueName : 'equipment borrowing' }} under Reference <strong>{{ $ref }}</strong> has officially concluded and post-event turnover inspection has been finalized by the AVR / PMO staff.
  </p>

  {{-- Clearance Certificate Banner --}}
  <div class="ref-card ref-card-success">
    <div class="ref-label">
      Custodial Clearance Certificate &bull; Official Return Receipt
      @if($isExternal)
        <span class="badge-external">External Cleared</span>
      @else
        <span class="badge-internal">FSUU Cleared</span>
      @endif
    </div>
    <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
    <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
      STATUS: {{ $clearanceLabel }} &bull; {{ $dateReturnedFormatted }}
    </div>
    <div style="font-size: 11px; color: #047857; margin-top: 2px;">
      Approved & Certified by: Audio-Visual Resource Center (AVR) Physical Plant / PMO
    </div>
  </div>

  {{-- Comprehensive Receipt Details Table --}}
  <table class="data-table">
    <tr>
      <td class="data-label">Tracking Number:</td>
      <td class="data-value" style="font-family: monospace; font-weight: 700; color: #1e40af;">{{ $ref }}</td>
    </tr>
    <tr>
      <td class="data-label">Applicant / Accountable:</td>
      <td class="data-value"><strong>{{ $requestorName }}</strong></td>
    </tr>
    <tr>
      <td class="data-label">Identity / Role:</td>
      <td class="data-value">{{ $applicantIdentity }} &bull; {{ $organization }}</td>
    </tr>
    <tr>
      <td class="data-label">Email Address:</td>
      <td class="data-value">{{ $applicantEmail }}</td>
    </tr>
    <tr>
      <td class="data-label">Phone Number:</td>
      <td class="data-value">{{ $applicantPhone }}</td>
    </tr>
    <tr>
      <td class="data-label">Selected Venue / Facility:</td>
      <td class="data-value">
        @if($isVenue)
          <strong>{{ $venueName }}</strong> ({{ $venueLocation }})
        @else
          AVR Custodial Counter (Place of Use: {{ $booking->place_of_use ?? 'Inside Campus' }})
        @endif
      </td>
    </tr>
    <tr>
      <td class="data-label">Date Time Used:</td>
      <td class="data-value">{{ $dateUsedFormatted }}</td>
    </tr>
    <tr>
      <td class="data-label">Date Time Returned:</td>
      <td class="data-value"><strong>{{ $dateReturnedFormatted }}</strong></td>
    </tr>
    @if(!empty($releasedByName))
    <tr>
      <td class="data-label">Originally Released By:</td>
      <td class="data-value"><strong>{{ $releasedByName }}</strong></td>
    </tr>
    @endif
    <tr>
      <td class="data-label">Event Purpose:</td>
      <td class="data-value">{{ $purpose }}</td>
    </tr>
  </table>

  {{-- Returned Equipment Units Table (if assigned/resolved units exist) --}}
  @if($resolvedUnits->isNotEmpty())
    <div style="margin: 18px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
        Returned Unit Inspection &amp; Custodial Clearance Record (Seq No., Asset Barcode &amp; Inspection Results):
      </div>
      @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'receipt', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
    </div>
  @elseif(!empty($equipmentList))
    <div style="margin: 14px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">Returned Equipment Items:</div>
      @foreach($equipmentList as $eqItem)
        @php
          $itemLabel = is_array($eqItem) ? ($eqItem['label'] ?? ($eqItem['name'] ?? 'Equipment Item')) : $eqItem;
          $builtIns = is_array($eqItem) ? ($eqItem['built_ins'] ?? []) : [];
        @endphp
        <div style="font-size: 13px; color: #0f172a; margin-bottom: 4px;">
          <div>&bull; <strong>{{ $itemLabel }}</strong> <span style="display: inline-block; background-color: #f0fdf4; color: #166534; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">RETURNED RESTORED</span></div>
          @if(!empty($builtIns) && count($builtIns) > 0)
            <div style="margin-left: 14px; margin-top: 2px; font-size: 11.5px; color: #475569;">
              <span style="font-weight: 700; color: #2563eb;">Built-in:</span>
              @foreach($builtIns as $bName)
                <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 6px; font-size: 10.5px; font-weight: 700; margin: 1px 2px;">{{ $bName }}</span>
              @endforeach
            </div>
          @endif
        </div>
      @endforeach
    </div>
  @endif

  @if(!empty($remarks))
    <div class="callout callout-info">
      <strong style="display:block; margin-bottom: 2px;">Turnover Remarks / Custodial Notes:</strong>
      <div>{{ $remarks }}</div>
    </div>
  @endif

  @if($isExternal)
    <div class="callout callout-external">
      <strong style="display:block; margin-bottom: 4px;">🏢 External Account Clearance Security Deposit:</strong>
      <div>This digital receipt certifies that all institutional facilities and assets loaned to <strong>{{ $organization }}</strong> have been restored in good order. You may present this official clearance notice to the Cashier / Accounting Office for security deposit release endorsement and to Campus Security for production gate egress.</div>
    </div>
  @else
    <div class="callout callout-success">
      <strong style="display:block; margin-bottom: 4px;">✅ Custodial Responsibility Discharged:</strong>
      <div>Your custodial accountability record for this transaction is officially closed in good standing. No liabilities or equipment clearance holds remain on your university account.</div>
    </div>
  @endif

{{-- =========================================================================
     4. APPROVED (OFFICIAL CAMPUS GATE PASS & CLAIM / INGRESS PERMIT)
   ========================================================================= --}}
@elseif($normStatus === 'approved')
  <p style="margin-top: 0;">Hi <strong>{{ $requestorName }}</strong>,</p>

  @if(!$isVenue)
    {{-- Equipment Approved --}}
    @if($hasGatePass)
      {{-- Equipment WITH Unique Physical Units Assigned (Together with units & serials) --}}
      <p>Your equipment borrowing request has been approved and unique equipment units have been assigned for your schedule. <strong>This email also serves as your official Campus Gate Pass approved by the AVR / PMO.</strong></p>

      {{-- Official Gate Pass Card --}}
      <div class="gatepass-card">
        <div class="gatepass-header">
          <div>
            <span class="gatepass-badge">OFFICIAL CAMPUS GATE PASS</span>
            <h3 class="gatepass-title" style="margin-top: 6px;">Equipment Claim &amp; Access Permit</h3>
            <div style="font-size: 11px; color: #166534; font-weight: 600; margin-top: 2px;">
              Authorized by: Audio-Visual Resource Center (AVR) &bull; Physical Plant / PMO
            </div>
          </div>
        </div>

        <table class="data-table" style="margin: 8px 0;">
          <tr>
            <td class="data-label" style="width: 32%;">Gate Pass / Ref No.:</td>
            <td class="data-value" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #15803d;">{{ $ref }}</td>
          </tr>
          <tr>
            <td class="data-label">Authorized Bearer:</td>
            <td class="data-value"><strong>{{ $requestorName }}</strong> ({{ $applicantIdentity }})</td>
          </tr>
          <tr>
            <td class="data-label">Affiliation:</td>
            <td class="data-value">{{ $organization }}</td>
          </tr>
          <tr>
            <td class="data-label">Contact Details:</td>
            <td class="data-value">{{ $applicantPhone }} &bull; {{ $applicantEmail }}</td>
          </tr>
          <tr>
            <td class="data-label">Claim Destination:</td>
            <td class="data-value">AVR Custodial Counter (Main Building, 2nd Floor)</td>
          </tr>
          <tr>
            <td class="data-label">Valid Schedule:</td>
            <td class="data-value"><strong>{{ $sched }}</strong></td>
          </tr>
          <tr>
            <td class="data-label">Purpose:</td>
            <td class="data-value">{{ $purpose }}</td>
          </tr>
        </table>

        {{-- Units Table with Serial Numbers and Built-in Serial Numbers --}}
        <div style="margin: 14px 0 8px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.6px; margin-bottom: 6px;">
            Authorized Physical Units &amp; Serial Numbers Covered by Gate Pass:
          </div>
          @include('emails.partials.equipment_unit_table', [
            'units' => $resolvedUnits,
            'mode' => 'release',
            'equipmentList' => $equipmentList ?? [],
            'booking' => $booking ?? null
          ])
        </div>

        <div class="callout callout-success" style="margin: 10px 0 0 0; background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 10px 14px;">
          <strong style="display:block; margin-bottom: 2px; color: #065f46; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">👮 NOTICE TO CAMPUS SECURITY GATE PERSONNEL:</strong>
          <div style="font-size: 12px; color: #047857; line-height: 1.4;">
            Please verify the serial numbers listed above against the physical units. Grant entry/exit to the bearer through campus gates upon presentation of this Gate Pass and valid ID for authorized university AV equipment during the scheduled timeframe. Approved by AVR / PMO.
          </div>
        </div>
      </div>

      @if($isExternal)
        <div class="callout callout-external">
          <strong style="display:block; margin-bottom: 4px;">📌 External Pickup Instructions:</strong>
          <div>1. Present this Gate Pass and your original <strong>Government-Issued Photo ID</strong> at the university entrance gate.</div>
          <div style="margin-top: 4px;">2. Report to the AVR Custodial Counter (Main Building, 2nd Floor).</div>
          <div style="margin-top: 4px;">3. Present the Cashier Official Receipt (O.R.) for rental fees before units are released.</div>
          <div style="margin-top: 4px;">4. Inspect and test all accessories before signing custody transfer.</div>
        </div>
      @else
        <div class="callout callout-info">
          <strong style="display:block; margin-bottom: 4px;">📌 Counter Claim Protocols:</strong>
          <div>&bull; Proceed to the AVR Custodial Counter (Main Building, 2nd Floor).</div>
          <div>&bull; Present your physical <strong>FSUU School ID</strong> along with this Gate Pass (Reference Code: <strong>{{ $ref }}</strong>).</div>
          <div>&bull; Arrive 15 minutes before your schedule to complete barcode scanning and power check.</div>
        </div>
      @endif

    @else
      {{-- Equipment ONLY Approved (NO Units Assigned Yet -> NO GATE PASS) --}}
      <p>Your equipment borrowing request has been approved. The gear has been earmarked for your schedule at the AVR counter.</p>

      <div class="ref-card ref-card-success">
        <div class="ref-label">
          Borrowing Reference Code
          @if($isExternal)
            <span class="badge-external">External Borrower</span>
          @else
            <span class="badge-internal">FSUU Account</span>
          @endif
        </div>
        <div class="ref-value" style="color: #15803d;">{{ $ref }}</div>
        <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px;">
          Approved Schedule: {{ $sched }}
        </div>
      </div>

      <table class="data-table">
        <tr>
          <td class="data-label" style="width: 32%;">Borrower:</td>
          <td class="data-value"><strong>{{ $requestorName }}</strong> ({{ $applicantIdentity }})</td>
        </tr>
        <tr>
          <td class="data-label">Affiliation:</td>
          <td class="data-value">{{ $organization }}</td>
        </tr>
        <tr>
          <td class="data-label">Contact Details:</td>
          <td class="data-value">{{ $applicantPhone }} &bull; {{ $applicantEmail }}</td>
        </tr>
        <tr>
          <td class="data-label">Pickup Location:</td>
          <td class="data-value">AVR Custodial Counter (Main Building, 2nd Floor)</td>
        </tr>
        <tr>
          <td class="data-label">Purpose:</td>
          <td class="data-value">{{ $purpose }}</td>
        </tr>
      </table>

      @if(!empty($equipmentList))
        <div style="margin: 14px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">Approved Equipment Items to Claim:</div>
          @foreach($equipmentList as $eqItem)
            @php
              $itemLabel = is_array($eqItem) ? ($eqItem['label'] ?? ($eqItem['name'] ?? 'Equipment Item')) : $eqItem;
              $builtIns = is_array($eqItem) ? ($eqItem['built_ins'] ?? []) : [];
            @endphp
            <div style="font-size: 13px; color: #0f172a; margin-bottom: 4px;">
              <div>&bull; <strong>{{ $itemLabel }}</strong></div>
              @if(!empty($builtIns) && count($builtIns) > 0)
                <div style="margin-left: 14px; margin-top: 2px; font-size: 11.5px; color: #475569;">
                  <span style="font-weight: 700; color: #2563eb;">Built-in inclusions:</span>
                  @foreach($builtIns as $bName)
                    <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 6px; font-size: 10.5px; font-weight: 700; margin: 1px 2px;">{{ $bName }}</span>
                  @endforeach
                </div>
              @endif
            </div>
          @endforeach
        </div>
      @endif

      <div class="callout callout-info">
        <strong style="display:block; margin-bottom: 4px;">📌 Counter Claim &amp; Unit Assignment Instructions:</strong>
        <div>&bull; Proceed to the AVR Custodial Counter (Main Building, 2nd Floor) during your scheduled pickup time.</div>
        <div>&bull; Present your physical <strong>FSUU School / Employee ID</strong> (or Government ID for external clients) and Reference Number: <strong>{{ $ref }}</strong>.</div>
        <div>&bull; Custodial staff will scan the specific physical units, test their condition, and issue the official hand-over.</div>
        <div style="margin-top: 6px; font-size: 11.5px; color: #0369a1; border-top: 1px dashed #bae6fd; padding-top: 4px;">
          ℹ️ <em>Official Campus Gate Pass with individual equipment serial numbers will be issued once physical units are scanned and assigned at the counter.</em>
        </div>
      </div>
    @endif

  @else
    {{-- Venue Approved --}}
    @if($hasGatePass)
      {{-- Venue with Gate Pass (External User OR Venue with Equipment Borrowed) --}}
      <p>Your reservation request for <strong>{{ $venueName }}</strong> is confirmed and locked on the university calendar. <strong>This document now serves as your official Campus Gate Pass & Facility Access Permit approved by the AVR / PMO.</strong></p>

      {{-- Official Gate Pass Card --}}
      <div class="gatepass-card">
        <div class="gatepass-header">
          <div>
            <span class="gatepass-badge">OFFICIAL CAMPUS GATE PASS</span>
            <h3 class="gatepass-title" style="margin-top: 6px;">Facility Ingress Event Access Permit</h3>
            <div style="font-size: 11px; color: #166534; font-weight: 600; margin-top: 2px;">
              Authorized by: Audio-Visual Resource Center (AVR) Physical Plant / PMO
            </div>
          </div>
        </div>

        <table class="data-table" style="margin: 8px 0;">
          <tr>
            <td class="data-label" style="width: 32%;">Gate Pass / Ref No.:</td>
            <td class="data-value" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #15803d;">{{ $ref }}</td>
          </tr>
          <tr>
            <td class="data-label">Authorized Organizer:</td>
            <td class="data-value"><strong>{{ $requestorName }}</strong> ({{ $applicantIdentity }})</td>
          </tr>
          <tr>
            <td class="data-label">Affiliation / Group:</td>
            <td class="data-value">{{ $organization }}</td>
          </tr>
          <tr>
            <td class="data-label">Contact Details:</td>
            <td class="data-value">{{ $applicantPhone }} &bull; {{ $applicantEmail }}</td>
          </tr>
          <tr>
            <td class="data-label">Reserved Facility:</td>
            <td class="data-value"><strong>{{ $venueName }}</strong> ({{ $venueLocation }})</td>
          </tr>
          <tr>
            <td class="data-label">Authorized Schedule:</td>
            <td class="data-value"><strong>{{ $sched }}</strong></td>
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
            <td class="data-label">Authorized AV Gear:</td>
            <td class="data-value">{{ implode(', ', array_map(fn($e) => is_array($e) ? ($e['label'] ?? '') : (string)$e, $equipmentList)) }}</td>
          </tr>
          @endif
        </table>

        @if($resolvedUnits->isNotEmpty())
        <div style="margin: 14px 0 8px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.6px; margin-bottom: 6px;">
            Authorized AV Equipment Units &amp; Serial Numbers Covered by Gate Pass:
          </div>
          @include('emails.partials.equipment_unit_table', [
            'units' => $resolvedUnits,
            'mode' => 'release',
            'equipmentList' => $equipmentList ?? [],
            'booking' => $booking ?? null
          ])
        </div>
        @endif

        <div class="callout callout-success" style="margin: 10px 0 0 0; background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 10px 14px;">
          <strong style="display:block; margin-bottom: 2px; color: #065f46; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">👮 NOTICE TO CAMPUS SECURITY GATE PERSONNEL:</strong>
          <div style="font-size: 12px; color: #047857; line-height: 1.4;">
            Please grant entry to the bearer, registered participants, and production personnel through university gates. Clear ingress/egress of authorized event materials and production supplies for the scheduled venue and timeslot. Endorsed & approved by AVR / PMO.
          </div>
        </div>
      </div>

      @if($isExternal)
        <div class="callout callout-external">
          <strong style="display:block; margin-bottom: 4px;">🏢 External Client Ingress Cashier Settlement:</strong>
          <div>1. <strong>Gate Clearance:</strong> Present this Gate Pass and valid Government Photo ID at the campus main security gate for visitor ingress and vehicle parking pass.</div>
          <div style="margin-top: 4px;">2. <strong>Cashier Payment:</strong> Pay the venue rental and utility fees at the FSUU Cashier (Main Building Ground Floor). Present the Official Receipt (O.R.) to the AVR / PMO custodian upon arrival.</div>
          <div style="margin-top: 4px;">3. <strong>Facility Turnover:</strong> Meet the PMO custodian 30 minutes before event start for key turnover and equipment check.</div>
        </div>
      @else
        <div class="callout callout-info">
          <strong style="display:block; margin-bottom: 4px;">🏛️ Room Access Equipment Gate Clearance:</strong>
          <div>&bull; Present your physical <strong>FSUU School ID</strong> and this Gate Pass when transporting authorized equipment across campus gates / buildings.</div>
          <div>&bull; Report to the counter 15 minutes before start time to receive room keys and equipment remotes.</div>
          <div>&bull; Ensure the venue is left clean and secured after use.</div>
        </div>
      @endif

    @else
      {{-- Standard Venue Confirmation (Internal Student/Faculty with Venue ONLY, NO Equipment) --}}
      <p>Your reservation request for <strong>{{ $venueName }}</strong> is confirmed and locked on the university calendar.</p>

      <div class="ref-card ref-card-success">
        <div class="ref-label">
          Confirmed Reservation
          <span class="badge-internal">FSUU Approved</span>
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
          <td class="data-label">Requested AV Gear:</td>
          <td class="data-value">{{ implode(', ', array_map(fn($e) => is_array($e) ? ($e['label'] ?? '') : (string)$e, $equipmentList)) }}</td>
        </tr>
        @endif
      </table>

      @if($resolvedUnits->isNotEmpty())
        <div style="margin: 14px 0 8px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.6px; margin-bottom: 6px;">
            Assigned AV Equipment Units (Seq No., Serial No., Brand &amp; Model):
          </div>
          @include('emails.partials.equipment_unit_table', [
            'units' => $resolvedUnits,
            'mode' => 'release',
            'equipmentList' => $equipmentList ?? [],
            'booking' => $booking ?? null
          ])
        </div>
      @endif

      <div class="callout callout-info">
        <strong style="display:block; margin-bottom: 4px;">🏛️ Room Access Keys:</strong>
        <div>&bull; Meet the AVR custodian or report to the counter 15 minutes before start time with your physical <strong>FSUU School ID</strong> to receive room keys and aircon remotes.</div>
        <div>&bull; Ensure the venue is left clean, orderly, and secured after use.</div>
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

    @if($resolvedUnits->isNotEmpty())
      <div style="margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
          Assigned Venue Equipment Units (Seq No., Serial No., Brand &amp; Model):
        </div>
        @include('emails.partials.equipment_unit_table', ['units' => $resolvedUnits, 'mode' => 'release', 'equipmentList' => $equipmentList ?? [], 'booking' => $booking ?? null])
      </div>
    @elseif(!empty($equipmentList))
      <div style="margin: 14px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">Requested Venue Equipment:</div>
        @foreach($equipmentList as $eqItem)
          @php
            $itemLabel = is_array($eqItem) ? ($eqItem['label'] ?? ($eqItem['name'] ?? 'Equipment Item')) : $eqItem;
            $builtIns = is_array($eqItem) ? ($eqItem['built_ins'] ?? []) : [];
          @endphp
          <div style="font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            <div>&bull; <strong>{{ $itemLabel }}</strong></div>
          </div>
        @endforeach
      </div>
    @endif

    <div class="callout callout-info">
      <strong style="display:block; margin-bottom: 4px;">⏰ Arrival Setup:</strong>
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
    <p>Your request for <strong>{{ $isVenue ? $venueName : 'Equipment Borrowing' }}</strong> under Reference <strong>{{ $ref }}</strong> has been cancelled.</p>

    <div class="ref-card ref-card-danger">
      <div class="ref-label">Cancelled Reference</div>
      <div class="ref-value" style="color: #991b1b;">{{ $ref }}</div>
      <div style="font-size: 13px; font-weight: 700; color: #7f1d1d; margin-top: 4px;">
        Scheduled Time: {{ $sched }}
      </div>
    </div>

    <div class="callout callout-danger">
      <strong style="display:block; margin-bottom: 2px;">Reason / Cancellation Notice:</strong>
      <div>{{ $remarks ?? ($normStatus === 'cancelled' ? 'Cancelled per applicant request.' : 'The scheduled start time and auto-cancel threshold elapsed without check-in or equipment collection.') }}</div>
    </div>

    <table class="data-table">
      <tr>
        <td class="data-label">Accountable {{ $isVenue ? 'Organizer' : 'Borrower' }}:</td>
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
      @if(!$isVenue)
      <tr>
        <td class="data-label">Requested Items:</td>
        <td class="data-value">
          @if(!empty($equipmentList))
            @foreach($equipmentList as $eqItem)
              @php
                $itemLabel = is_array($eqItem) ? ($eqItem['label'] ?? ($eqItem['name'] ?? 'Equipment Item')) : $eqItem;
                $builtIns = is_array($eqItem) ? ($eqItem['built_ins'] ?? []) : [];
              @endphp
              <div style="margin-bottom: 6px;">
                <div>&bull; <strong>{{ $itemLabel }}</strong></div>
                @if(!empty($builtIns) && count($builtIns) > 0)
                  <div style="margin-left: 14px; margin-top: 3px; font-size: 12px; color: #475569;">
                    <span style="font-weight: 700; color: #1e40af;">Built-in:</span>
                    @foreach($builtIns as $bName)
                      <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 700; margin: 1px 2px;">{{ $bName }}</span>
                    @endforeach
                  </div>
                @endif
              </div>
            @endforeach
          @else
            {{ $booking->equipment_name ?? 'Equipment requested' }}
          @endif
        </td>
      </tr>
      @endif
      <tr>
        <td class="data-label">Current Status:</td>
        <td class="data-value"><strong style="color: #b91c1c;">CANCELLED</strong></td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #475569;">
      The reserved timeslot and equipment units have been released back to university inventory. If you wish to submit a new request, you may do so through the online portal.
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
    Location: Main Building<br>
    @if(!empty($sysSettings->contact_email)) Email: <a href="mailto:{{ $sysSettings->contact_email }}" style="color: #2563eb; text-decoration: none;">{{ $sysSettings->contact_email }}</a> &bull; @endif
    @if(!empty($sysSettings->contact_phone)) Phone: {{ $sysSettings->contact_phone }} @endif
    <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
      This is an automated operational notice generated by the FSUU Venue Reservation Equipment Lending System.
    </div>
  </div>
</div>

</body>
</html>
