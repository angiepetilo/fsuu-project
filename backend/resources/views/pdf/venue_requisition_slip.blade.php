<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Venue Requisition Slip - {{ $booking->reference_code }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0f1c3f;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            color: #0f1c3f;
            text-transform: uppercase;
        }
        .header h2 {
            margin: 5px 0 0 0;
            font-size: 16px;
            font-weight: normal;
        }
        .title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-decoration: underline;
        }
        .row {
            margin-bottom: 12px;
        }
        .label {
            font-weight: bold;
            display: inline-block;
            width: 180px;
        }
        .value {
            display: inline-block;
            border-bottom: 1px solid #ccc;
            width: calc(100% - 190px);
            padding-bottom: 2px;
        }
        .section-title {
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-size: 14px;
            background-color: #f0f0f0;
            padding: 5px;
        }
        .signatures {
            margin-top: 50px;
            width: 100%;
            border-collapse: collapse;
        }
        .signatures td {
            width: 50%;
            padding-top: 40px;
            vertical-align: bottom;
        }
        .sig-line {
            border-bottom: 1px solid #333;
            width: 80%;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>Father Saturnino Urios University</h1>
        <h2>AVR & SCO Requisition Slip</h2>
    </div>

    <div class="title">VENUE RESERVATION</div>

    <div class="section-title">Requestor Information</div>
    <div class="row">
        <span class="label">Reference Code:</span>
        <span class="value" style="font-family: monospace; font-weight: bold;">{{ $booking->reference_code }}</span>
    </div>
    <div class="row">
        <span class="label">Requestor Name:</span>
        <span class="value">{{ $booking->requestor_name }}</span>
    </div>
    <div class="row">
        <span class="label">Email Address:</span>
        <span class="value">{{ $booking->requestor_email ?? 'N/A' }}</span>
    </div>
    <div class="row">
        <span class="label">Contact Number:</span>
        <span class="value">{{ $booking->requestor_contact_number }}</span>
    </div>
    <div class="row">
        <span class="label">Program/Office:</span>
        <span class="value">{{ $booking->requestor_program_office }}</span>
    </div>
    <div class="row">
        <span class="label">Identity Type:</span>
        <span class="value" style="text-transform: capitalize;">{{ $booking->requestor_identity_type }}</span>
    </div>

    <div class="section-title">Booking Details</div>
    <div class="row">
        <span class="label">Venue Requested:</span>
        <span class="value">{{ $booking->venue->name ?? 'N/A' }}</span>
    </div>
    <div class="row">
        <span class="label">Purpose:</span>
        <span class="value">{{ $booking->purpose }}</span>
    </div>
    <div class="row">
        <span class="label">Number of Persons:</span>
        <span class="value">{{ $booking->number_of_persons }}</span>
    </div>
    <div class="row">
        <span class="label">Start Date & Time:</span>
        <span class="value">{{ \Carbon\Carbon::parse($booking->start_datetime)->format('F d, Y - h:i A') }}</span>
    </div>
    <div class="row">
        <span class="label">End Date & Time:</span>
        <span class="value">{{ \Carbon\Carbon::parse($booking->end_datetime)->format('F d, Y - h:i A') }}</span>
    </div>

    <table class="signatures">
        <tr>
            <td>
                <div class="sig-line"></div>
                <strong>Requestor Signature Over Printed Name</strong><br>
                Date: ____________________
            </td>
            <td>
                <div class="sig-line"></div>
                <strong>Noted By (Adviser / Dean / Head)</strong><br>
                Date: ____________________
            </td>
        </tr>
    </table>

</body>
</html>
