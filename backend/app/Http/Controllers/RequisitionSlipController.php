<?php

namespace App\Http\Controllers;

use App\Models\AvrVenueBooking;
use App\Models\EquipmentBorrowing;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequisitionSlipController extends Controller
{
    public function download($type, $referenceCode)
    {
        if ($type === 'venue') {
            $booking = AvrVenueBooking::with('venue')->where('reference_code', $referenceCode)->firstOrFail();
            $view = 'pdf.venue_requisition_slip';
            $filename = "Venue_Requisition_{$referenceCode}.pdf";
        } elseif ($type === 'equipment') {
            $booking = EquipmentBorrowing::with('items.equipmentType')->where('reference_code', $referenceCode)->firstOrFail();
            $view = 'pdf.equipment_requisition_slip';
            $filename = "Equipment_Requisition_{$referenceCode}.pdf";
        } else {
            abort(404);
        }

        $pdf = Pdf::loadView($view, compact('booking'))->setPaper('letter', 'portrait');

        return $pdf->download($filename);
    }
}
