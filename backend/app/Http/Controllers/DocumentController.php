<?php

namespace App\Http\Controllers;

use App\Http\Requests\Staff\StoreDocumentRequest;
use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(private DocumentService $service) {}

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $path = $request->file('file')->store('documents', 'local');

        $document = $this->service->recordUpload(
            $request->input('reference_type'),
            $request->input('reference_id'),
            $path,
            $request->input('document_type'),
            $request->user()
        );

        return response()->json($document, 201);
    }

    public function approve(Request $request, Document $document): JsonResponse
    {
        $request->validate(['remarks' => ['nullable', 'string', 'max:255']]);

        $approved = $this->service->approve($document, $request->user(), $request->input('remarks'));

        return response()->json($approved);
    }

    public function reject(Request $request, Document $document): JsonResponse
    {
        $request->validate(['remarks' => ['required', 'string', 'max:255']]);

        $rejected = $this->service->reject($document, $request->user(), $request->input('remarks'));

        return response()->json($rejected);
    }

    public function download(Request $request, Document $document): StreamedResponse
    {
        if (! $this->authorizeDownload($request->user(), $document)) {
            abort(403, 'Unauthorized to view this document.');
        }

        if (! Storage::disk('local')->exists($document->file_path)) {
            abort(404, 'File not found.');
        }

        return Storage::disk('local')->download($document->file_path);
    }

    private function authorizeDownload(\App\Models\User $user, Document $document): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($document->reference_type === 'avr_venue_booking') {
            $booking = \App\Models\AvrVenueBooking::with('venue')->find($document->reference_id);
            if ($booking) {
                // Same-office ID check
                if ($user->office_id === $booking->venue->office_id) {
                    return true;
                }
                
                // SCO view-only oversight check
                $userOffice = $user->office;
                if ($userOffice && $userOffice->can_view_office_id === $booking->venue->office_id) {
                    return true;
                }
            }
        }

        return false;
    }
}
