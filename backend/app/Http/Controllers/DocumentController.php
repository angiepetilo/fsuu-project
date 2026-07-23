<?php

namespace App\Http\Controllers;

use App\Http\Requests\Staff\StoreDocumentRequest;
use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function __construct(private DocumentService $service) {}

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $path = $request->file('file')->store('documents');

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
}
