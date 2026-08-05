<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-line; margin: 0; padding: 20px; }
  </style>
</head>
<body>
Good day! {{ $booking->requestor_name ?? $booking->filer_name ?? 'Requestor' }}

Thank you for choosing FSUU for your {{ $booking->purpose ?? 'event' }} on {{ $formattedStart }} to {{ $formattedEnd }}.

Your Track Number: {{ $refCode }}

EPlease enter this code into the 'Track Reservation' page to check your booking progress. Our team is currently reviewing your form and will update your status shortly. If we need any additional information to complete your booking, we will contact you immediately. Thank you for your patience

If there's any concern about the venue booking please contact us in: angie.petilo@urios.edu.ph.

Friendly reminder: To ensure a smooth start, please note that we strictly observe a 15-minute grace period before the event begins.
</body>
</html>
