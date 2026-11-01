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
            $allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'docx', 'doc'];
            $allowedMimes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
            ];

            $origExt = strtolower($file->getClientOriginalExtension());
            $mime = $file->getMimeType();

            if (empty($origExt) || $origExt === 'tmp') {
                $origExt = match ($mime) {
                    'application/pdf' => 'pdf',
                    'image/png'       => 'png',
                    'image/gif'       => 'gif',
                    'image/webp'      => 'webp',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
                    'application/msword' => 'doc',
                    default           => 'jpg',
                };
            }

            if (!in_array($origExt, $allowedExtensions, true) || !in_array($mime, $allowedMimes, true)) {
                throw new \InvalidArgumentException("Invalid file type ({$origExt}). Allowed file types: PDF, PNG, JPG, WEBP, DOCX.");
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
                        'type'            => 'upload',
                        'access_mode'     => 'public',
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
                        'folder'      => 'fsuu/' . $folder,
                        'type'        => 'upload',
                        'access_mode' => 'public',
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

            $decoded = base64_decode((string)$data, true);
            if ($decoded === false || strlen($decoded) === 0 || strlen($decoded) > 5 * 1024 * 1024) {
                throw new \InvalidArgumentException('Invalid or oversized Base64 image payload.');
            }

            $detectedMime = null;
            if (function_exists('finfo_open')) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                if ($finfo) {
                    $detectedMime = finfo_buffer($finfo, $decoded);
                    finfo_close($finfo);
                }
            }

            $mimeType = $detectedMime ?: str_replace('data:', '', (string)$type);
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($mimeType, $allowedMimes, true)) {
                throw new \InvalidArgumentException('Unsupported Base64 image MIME type.');
            }

            $extension = match ($mimeType) {
                'image/png'  => 'png',
                'image/gif'  => 'gif',
                'image/webp' => 'webp',
                default      => 'jpg',
            };

            $cleanFolder = preg_replace('/[^a-zA-Z0-9_-]/', '', $folder) ?: 'general';
            $fileName = $cleanFolder . '_' . time() . '_' . Str::random(8) . '.' . $extension;
            $filePath = $cleanFolder . '/' . $fileName;

            Storage::disk('public')->put($filePath, $decoded);

            return url(Storage::url($filePath));
        } catch (\Throwable $e) {
            return '';
        }
    }
}
