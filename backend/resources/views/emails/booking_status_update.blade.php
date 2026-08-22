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
@endphp

@if(($type ?? 'venue') === 'equipment' && ($status ?? '') === 'approved')
<p>Good day {{ $requestorName }}. Use reference code {{ $ref }} to claim your item.</p>
<p>Please proceed to the office and present your School ID. Reminder: Arrive at least 15 minutes before your scheduled start time. Thank you.</p>
@elseif(($status ?? '') === 'approved')
<p>Reminder: Please ensure you arrive at least 15 minutes before your scheduled start time.</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} (Reference: {{ $ref }}) has been approved!<br>
Scheduled date: {{ $formattedStart }} to {{ $formattedEnd }}.</p>
@elseif(($status ?? '') === 'rejected')
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} (Reference: {{ $ref }}) was not approved.<br>
Remarks: {{ $remarks ?? 'None provided' }}</p>
@else
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} (Reference: {{ $ref }}) status has been updated to {{ ucfirst($status ?? 'updated') }}.</p>
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
