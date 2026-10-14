<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Exceptions\VenueOverlapException;
use App\Http\Requests\Public\StorePublicVenueBookingRequest;
use App\Services\VenueBookingService;
use Illuminate\Http\JsonResponse;

class VenueBookingController extends Controller
{
    public function __construct(private VenueBookingService $service) {}

    /**
     * POST /public/avr-venue-bookings/check-duplicate
     * Read-only pre-submit check so the frontend can warn the user about an existing
     * active/pending reservation under their identity BEFORE they submit the form.
     */
    public function checkDuplicate(\Illuminate\Http\Request $request): JsonResponse
    {
        $duplicate = $this->service->checkDuplicate($request->all());

        return response()->json([
            'duplicate' => (bool) $duplicate,
            'details'   => $duplicate,
        ]);
    }

    public function store(StorePublicVenueBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['submitted_by'] = null;

        $uploadedUrls = [];
        $mediaUploadService = app(\App\Services\MediaUploadService::class);

        if ($request->hasFile('endorsement_files')) {
            foreach ($request->file('endorsement_files') as $file) {
                if ($file) {
                    $url = $mediaUploadService->upload($file, 'endorsements');
                    if ($url) $uploadedUrls[] = $url;
                }
            }
        } elseif (is_array($request->input('endorsement_files'))) {
            foreach ($request->input('endorsement_files') as $fileInput) {
                if (!empty($fileInput)) {
                    $url = $mediaUploadService->upload($fileInput, 'endorsements');
                    if ($url) $uploadedUrls[] = $url;
                }
            }
        } elseif ($request->hasFile('endorsement_file')) {
            $url = $mediaUploadService->upload($request->file('endorsement_file'), 'endorsements');
            if ($url) $uploadedUrls[] = $url;
        } elseif ($request->filled('endorsement_file')) {
            $url = $mediaUploadService->upload($request->input('endorsement_file'), 'endorsements');
            if ($url) $uploadedUrls[] = $url;
        }

        $uploadedUrls = array_values(array_unique(array_filter($uploadedUrls)));

        if (!empty($uploadedUrls)) {
            $data['endorsement_url'] = $uploadedUrls[0];
            $data['endorsement_letter'] = $uploadedUrls[0];
        }

        try {
            $booking = $this->service->create($data);

            if (!empty($uploadedUrls) && $booking && isset($booking->id)) {
                foreach ($uploadedUrls as $fileUrl) {
                    $alreadyInserted = \Illuminate\Support\Facades\DB::table('documents')
                        ->where('venue_booking_id', $booking->id)
                        ->where('file_path', $fileUrl)
                        ->exists();

                    if (!$alreadyInserted) {
                        \Illuminate\Support\Facades\DB::table('documents')->insert([
                            'venue_booking_id' => $booking->id,
                            'document_type'    => 'endorsement_letter',
                            'file_path'        => $fileUrl,
                            'status'           => 'pending',
                            'uploaded_at'      => now(),
                            'created_at'       => now(),
                            'updated_at'       => now(),
                        ]);
                    }
                }
            }
        } catch (VenueOverlapException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\App\Exceptions\VenueReservationTooSoonException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Public Venue Booking Store Error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($booking, 201);
    }
}
