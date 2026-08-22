<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadService
{
    /**
     * Determine if Cloudinary cloud storage is active.
     */
    public function isCloudinaryEnabled(): bool
    {
        $url = env('CLOUDINARY_URL');
        return !empty($url) && str_starts_with($url, 'cloudinary://');
    }

    /**
     * Upload an UploadedFile (image or PDF) or a Base64 string.
     * Returns the permanent accessible HTTPS URL.
     *
     * @param UploadedFile|string $file
     * @param string $folder e.g. 'venues', 'equipment_types', 'endorsements', 'avatars'
     * @return string
     */
    public function upload(UploadedFile|string|null $file, string $folder = 'general'): ?string
    {
        if (empty($file)) {
            return null;
        }

        // If file is already a valid remote HTTPS/HTTP URL, return as-is
        if (is_string($file) && (str_starts_with($file, 'http://') || str_starts_with($file, 'https://'))) {
            return $file;
        }

        // Case 1: UploadedFile (Multipart Form Request)
        if ($file instanceof UploadedFile) {
            $origExt = strtolower($file->getClientOriginalExtension());
            if (empty($origExt) || $origExt === 'tmp') {
                $mime = $file->getMimeType();
                $origExt = match ($mime) {
                    'application/pdf' => 'pdf',
                    'image/png'       => 'png',
                    'image/gif'       => 'gif',
                    'image/webp'      => 'webp',
                    default           => 'jpg',
                };
            }
            $origName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $cleanName = Str::slug($origName) ?: 'doc';

            if ($this->isCloudinaryEnabled()) {
                try {
                    $isPdf = $origExt === 'pdf';
                    $options = [
                        'folder'          => 'fsuu/' . $folder,
                        'use_filename'    => true,
                        'unique_filename' => true,
                        'resource_type'   => $isPdf ? 'image' : 'auto',
                    ];
                    if ($isPdf) {
                        $options['format'] = 'pdf';
                    }
                    $upload = cloudinary()->uploadApi()->upload($file->getRealPath(), $options);
                    if (!empty($upload['secure_url'])) {
                        return $upload['secure_url'];
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("Cloudinary upload failed, falling back to local storage: " . $e->getMessage());
                }
            }

            // Fallback: Local Public Storage
            $fileName = $cleanName . '_' . time() . '_' . Str::random(6) . '.' . $origExt;
            $path = $file->storeAs($folder, $fileName, 'public');
            return url(Storage::url($path));
        }

        // Case 2: Base64 Image String
        if (is_string($file) && str_starts_with($file, 'data:')) {
            if ($this->isCloudinaryEnabled()) {
                try {
                    $upload = cloudinary()->uploadApi()->upload($file, [
                        'folder' => 'fsuu/' . $folder,
                    ]);
                    if (!empty($upload['secure_url'])) {
                        return $upload['secure_url'];
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("Cloudinary base64 upload failed, falling back to local storage: " . $e->getMessage());
                }
            }

            // Fallback: Local Base64 Storage
            return $this->saveBase64ToLocal($file, $folder);
        }

        return is_string($file) ? $file : null;
    }

    /**
     * Save base64 string to local public storage and return full public URL.
     */
    protected function saveBase64ToLocal(string $base64Data, string $folder): string
    {
        try {
            @list($type, $data) = explode(';', $base64Data);
            @list(, $data)      = explode(',', $data);

            $mimeType = str_replace('data:', '', $type);
            $extension = match ($mimeType) {
                'image/png'  => 'png',
                'image/gif'  => 'gif',
                'image/webp' => 'webp',
                default      => 'jpg',
            };

            $fileName = $folder . '_' . time() . '_' . Str::random(8) . '.' . $extension;
            $filePath = $folder . '/' . $fileName;

            Storage::disk('public')->put($filePath, base64_decode($data));

            return url(Storage::url($filePath));
        } catch (\Throwable $e) {
            return $base64Data;
        }
    }
}
