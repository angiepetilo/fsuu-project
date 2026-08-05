<?php

namespace App\Http\Controllers;

use App\Models\Office;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminOfficeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Office::latest()->get(['id', 'name', 'slug', 'location', 'created_at'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'slug'     => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
        ]);

        $data['slug'] = $this->generateUniqueSlug(
            $data['slug'] ?? null,
            $data['name'],
            $data['location'] ?? null
        );

        $office = Office::create($data);

        return response()->json($office, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $office = Office::findOrFail($id);

        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'slug'     => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
        ]);

        $name = $data['name'] ?? $office->name;
        $location = $data['location'] ?? $office->location;

        $data['slug'] = $this->generateUniqueSlug(
            $data['slug'] ?? null,
            $name,
            $location,
            $office->id
        );

        $office->update($data);

        return response()->json($office);
    }

    public function destroy(int $id): JsonResponse
    {
        $office = Office::findOrFail($id);
        $office->delete();

        return response()->json(['message' => 'Office deleted successfully']);
    }

    private function generateUniqueSlug(?string $customSlug, string $name, ?string $location, ?int $ignoreId = null): string
    {
        if (!empty($customSlug)) {
            $base = Str::slug($customSlug);
        } else {
            $base = $location ? Str::slug("{$name} {$location}") : Str::slug($name);
        }

        if (empty($base)) {
            $base = 'office';
        }

        $slug = $base;
        $count = 1;

        while (Office::where('slug', $slug)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$count}";
            $count++;
        }

        return $slug;
    }
}
