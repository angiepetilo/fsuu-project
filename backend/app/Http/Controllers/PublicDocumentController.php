<?php

namespace App\Http\Controllers;

use App\Http\Requests\Public\StorePublicDocumentRequest;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;

class PublicDocumentController extends Controller
{
    public function __construct(private DocumentService $service) {}

    public function store(StorePublicDocumentRequest $request): JsonResponse
    {
        $referenceType = $request->input('reference_type');
        $referenceCode = $request->input('reference_code');
        $requestorEmail = $request->input('requestor_email');
        $booking = null;

        // 1. CRITICAL FIX - IDOR check: Look up booking by reference_code AND requestor_email
        if ($referenceType === 'avr_venue_booking') {
            $booking = \App\Models\AvrVenueBooking::where('reference_code', $referenceCode)
                ->where('requestor_email', $requestorEmail)
                ->first();
        } elseif ($referenceType === 'sco_studio_reservation') {
            $booking = \App\Models\ScoStudioReservation::where('reference_code', $referenceCode)
                ->where('requestor_email', $requestorEmail)
                ->first();
        } elseif ($referenceType === 'equipment_borrowing') {
            $booking = \App\Models\EquipmentBorrowing::where('reference_code', $referenceCode)
                ->where('requestor_email', $requestorEmail)
                ->first();
        }

        if (! $booking) {
            abort(403, 'Invalid booking reference or email.');
        }

        // 1. STORAGE DISK: Explicitly specify 'local' disk to keep files private
        $path = $request->file('file')->store('documents', 'local');

        // 2. DOCUMENT_TYPE: Hardcode 'endorsement_letter' server-side
        $document = $this->service->recordUpload(
            $referenceType,
            $booking->id,
            $path,
            'endorsement_letter', // Ignore any frontend document_type
            null // uploaded_by is null for public uploads
        );

        return response()->json($document, 201);
    }
}
