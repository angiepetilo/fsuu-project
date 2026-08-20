<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;

class DocumentService
{
    public function __construct(private AuditLogService $auditLog) {}

    public function recordUpload(
        string $referenceType,
        int $referenceId,
        string $filePath,
        string $documentType,
        ?User $uploadedBy = null
    ): Document {
        $document = Document::forceCreate([
            'venue_booking_id' => $referenceId,
            'file_path'        => $filePath,
            'document_type'    => $documentType,
            'uploaded_at'      => now(),
        ]);

        try {
            $this->auditLog->log($uploadedBy, 'document_uploaded', $referenceType, $referenceId);
        } catch (\Throwable $e) {}

        return $document;
    }

    public function approve(Document $document, User $staff, ?string $remarks = null): Document
    {
        $document->forceFill(['status' => 'approved'])->save();

        try {
            $this->auditLog->log($staff, 'document_approved', 'venue_booking', $document->venue_booking_id, [
                'document_id' => $document->id,
            ]);
        } catch (\Throwable $e) {}

        return $document;
    }

    public function reject(Document $document, User $staff, string $remarks): Document
    {
        $document->forceFill(['status' => 'rejected'])->save();

        try {
            $this->auditLog->log($staff, 'document_rejected', 'venue_booking', $document->venue_booking_id, [
                'document_id' => $document->id,
            ]);
        } catch (\Throwable $e) {}

        return $document;
    }
}