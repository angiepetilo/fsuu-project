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

@php
    $normStatus = strtolower(str_replace(['_', '-'], ' ', (string)($status ?? '')));
@endphp

@if(in_array($normStatus, ['overdue', 'passed due']))
<p style="font-size: 16px; font-weight: bold; color: #dc2626;">URGENT FSUU OVERDUE NOTICE</p>
<p>Good day, {{ $requestorName }}.</p>
@if(($type ?? 'venue') === 'equipment')
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] (Scheduled: {{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}) is now <strong>OVERDUE</strong> for return.</p>
<p style="color: #b91c1c; font-weight: bold; background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px;">Please return all physical equipment units immediately to the AVR Center to prevent administrative holds, policy violation records, and penalties.</p>
@else
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] (Scheduled: {{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}) has passed its scheduled reservation end time.</p>
<p style="color: #b91c1c; font-weight: bold; background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px;">If your activity has concluded, please vacate the venue immediately or coordinate with the AVR Administrator for turnover inspection.</p>
@endif

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

@elseif(in_array($normStatus, ['completed', 'returned', 'done', 'cleared']))
<p style="font-size: 16px; font-weight: bold; color: #15803d;">RESERVATION COMPLETED &amp; CLEARED</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your {{ $itemType }} [<strong>{{ $ref }}</strong>] ({{ $formattedSchedule ?? ($formattedStart ?? 'Scheduled Time') }}) has been marked as <strong>COMPLETED</strong>.</p>
<div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #166534; font-weight: 600;">{{ $remarks ?? 'All turnover procedures, condition checks, and equipment inspections have been successfully cleared.' }}</p>
</div>
<p>Thank you for your cooperation and for using Father Saturnino Urios University AVR facilities and equipment.</p>

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
<p>Your {{ $itemType }} (Reference: <strong>{{ $ref }}</strong>) was not approved.<br>
Remarks: {{ $remarks ?? 'None provided' }}</p>

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
