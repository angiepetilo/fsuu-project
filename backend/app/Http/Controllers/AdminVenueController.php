<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminVenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Venue::with('office');

        if ($user && $user->office_id && !$user->isSuperAdmin()) {
            $query->where('office_id', $user->office_id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'office_id' => 'nullable|exists:offices,id',
            'name'      => 'required|string|max:255',
            'avatar'    => 'nullable|string',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'nullable|integer|min:1',
            'status'    => 'nullable|string',
        ]);

        if (empty($data['office_id'])) {
            $data['office_id'] = $user->office_id ?? (\App\Models\Office::first()?->id ?? 1);
        }

        if (empty($data['capacity'])) {
            $data['capacity'] = 100;
        }

        if (!empty($data['avatar'])) {
            $data['avatar'] = $this->saveBase64Image($data['avatar'], 'venues');
        }

        $venue = Venue::create($data);

        return response()->json($venue->load('office'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);

        $data = $request->validate([
            'office_id' => 'sometimes|exists:offices,id',
            'name'      => 'sometimes|string|max:255',
            'avatar'    => 'nullable|string',
            'location'  => 'nullable|string|max:255',
            'capacity'  => 'sometimes|integer|min:1',
            'status'    => 'sometimes|string',
        ]);

        if (array_key_exists('avatar', $data) && !empty($data['avatar'])) {
            $data['avatar'] = $this->saveBase64Image($data['avatar'], 'venues');
        }

        $venue->update($data);

        return response()->json($venue->load('office'));
    }

    public function destroy(int $id): JsonResponse
    {
        $venue = Venue::findOrFail($id);
        $venue->delete();

        return response()->json(['message' => 'Venue deleted successfully']);
    }

    private function saveBase64Image(?string $base64Data, string $folder = 'uploads'): ?string
    {
        if (!$base64Data) {
            return null;
        }

        if (str_starts_with($base64Data, '/storage/')) {
            return url($base64Data);
        }

        if (!str_contains($base64Data, ';base64,')) {
            return $base64Data;
        }

        try {
            @list($type, $fileData) = explode(';', $base64Data);
            @list(, $fileData)      = explode(',', $fileData);

            $mimeType = str_replace('data:', '', $type);
            $extension = match ($mimeType) {
                'image/png'  => 'png',
                'image/gif'  => 'gif',
                'image/webp' => 'webp',
                default      => 'jpg',
            };

            $fileName = $folder . '_' . time() . '_' . Str::random(8) . '.' . $extension;
            $filePath = $folder . '/' . $fileName;

            Storage::disk('public')->put($filePath, base64_decode($fileData));

            return url(Storage::url($filePath));
        } catch (\Throwable $e) {
            return $base64Data;
        }
    }
}
