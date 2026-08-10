<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #ffffff; margin: 0; padding: 20px; }
    p { margin-bottom: 16px; }
    .signoff { margin-top: 24px; }
  </style>
</head>
<body>
@php
    $mode = $mode ?? ($status ?? 'pending');
    $requestorName = $booking->requestor_name ?? $booking->filer_name ?? 'Requestor';
    $ref = $refCode ?? ($booking->reference_code ?? 'TRK-FSUU');
    $date = $formattedDate ?? (isset($booking->date_of_usage) ? substr((string)$booking->date_of_usage, 0, 10) : 'Scheduled Date');
    $start = $formattedStart ?? ($booking->time_start ?? 'Start Time');
    $end = $formattedEnd ?? ($booking->time_end ?? 'End Time');
@endphp

@if($mode === 'approved')
<p>Reminder: Please ensure you arrive at least 15 minutes before your scheduled start time.</p>
<p>Good day, {{ $requestorName }}.</p>
<p>Your venue reservation (Reference: {{ $ref }}) has been approved!<br>
Your scheduled date is {{ $date }} from {{ $start }} to {{ $end }}.</p>
@elseif($mode === 'reminder')
<p>Reminder: Please ensure you arrive at least 15 minutes before your scheduled start time.</p>
<p>Good day, {{ $requestorName }}. This is a reminder that your venue reservation (Reference: {{ $ref }}) is today! Your scheduled time is from {{ $start }} to {{ $end }}.</p>
@else
<p>Good day, {{ $requestorName }}.</p>
<p>Your venue reservation (Reference: {{ $ref }}) has been submitted to the system and is awaiting review and approval by our staff. You can track the status of your reservation at any time by searching for your tracking number.<br>
Your Reference Number: {{ $ref }}</p>
@endif

<p>If you have any questions or require assistance, please contact the System Administrator.</p>

<p class="signoff">
Respectfully,<br>
System Administrator<br>
Father Saturnino Urios University, Butuan City
</p>
</body>
</html>
