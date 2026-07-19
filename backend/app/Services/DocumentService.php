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
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'file_path' => $filePath,
            'document_type' => $documentType,
            'uploaded_by' => $uploadedBy?->id,
        ]);

        $this->auditLog->log($uploadedBy, 'document_uploaded', $referenceType, $referenceId);

        return $document;
    }

    public function approve(Document $document, User $staff, ?string $remarks = null): Document
    {
        $document->forceFill(['status' => 'approved', 'remarks' => $remarks])->save();

        $this->auditLog->log($staff, 'document_approved', $document->reference_type, $document->reference_id, [
            'document_id' => $document->id,
        ]);

        return $document;
    }

    public function reject(Document $document, User $staff, string $remarks): Document
    {
        $document->forceFill(['status' => 'rejected', 'remarks' => $remarks])->save();

        $this->auditLog->log($staff, 'document_rejected', $document->reference_type, $document->reference_id, [
            'document_id' => $document->id,
        ]);

        return $document;
    }
}