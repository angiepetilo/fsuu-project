<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #ffffff; margin: 0; padding: 20px; }
    p { margin-bottom: 14px; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .btn { display: inline-block; background-color: #1e3a8a; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
  </style>
</head>
<body>

@php
    $sysSettings = \App\Models\SystemSetting::getSettings();
    $headline = match($taskType) {
        'new_venue_booking'        => 'New Venue Reservation Awaiting Review',
        'new_equipment_borrowing'  => 'New Equipment Borrowing Awaiting Review',
        'requirements_resubmitted' => 'Missing Requirements Resubmitted',
        'incomplete_notice'        => 'Reservation Marked Incomplete',
        default                    => 'AVR Task Notification',
    };
@endphp

<h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">{{ $headline }}</h2>

<p>Hello AVR Management Team,</p>

<p>A new task requires administrative attention in the FSUU Booking &amp; Requisition Management System.</p>

<div class="card">
  <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
    <tr>
      <td style="width: 130px; font-weight: bold; color: #64748b; padding: 4px 0;">Reference Code:</td>
      <td style="font-family: monospace; font-weight: bold; color: #0f2c59;">{{ $referenceCode }}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Task Summary:</td>
      <td style="color: #1e293b;">{{ $details }}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Filer / Requestor:</td>
      <td style="color: #1e293b;">{{ $record->filer_name ?? $record->requestor_name ?? '—' }}</td>
    </tr>
    @if(!empty($record->date_of_usage) || !empty($record->start_datetime))
    <tr>
      <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Usage Date:</td>
      <td style="color: #1e293b;">{{ \Carbon\Carbon::parse($record->date_of_usage ?? $record->start_datetime)->format('M d, Y') }}</td>
    </tr>
    @endif
    @if(!empty($record->time_start) && !empty($record->time_end))
    <tr>
      <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Scheduled Time:</td>
      <td style="color: #1e293b;">{{ substr($record->time_start, 0, 5) }} - {{ substr($record->time_end, 0, 5) }}</td>
    </tr>
    @endif
  </table>
</div>

@if($actionUrl)
<p style="margin: 20px 0;">
  <a href="{{ $actionUrl }}" class="btn">Open Requisition in Portal &rarr;</a>
</p>
@endif

<p style="color: #64748b; font-size: 12px; margin-top: 24px;">
  This notification was automatically sent to Super Admins and Staff of Father Saturnino Urios University PMO / AVR Center.
</p>

</body>
</html>
