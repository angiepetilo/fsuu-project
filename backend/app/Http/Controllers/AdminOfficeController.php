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
            'slug'     => 'nullable|string|max:255|unique:offices,slug',
            'location' => 'nullable|string|max:255',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        } else {
            $data['slug'] = Str::slug($data['slug']);
        }

        $office = Office::create($data);

        return response()->json($office, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $office = Office::findOrFail($id);

        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'slug'     => 'nullable|string|max:255|unique:offices,slug,' . $id,
            'location' => 'nullable|string|max:255',
        ]);

        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        } elseif (!empty($data['slug'])) {
            $data['slug'] = Str::slug($data['slug']);
        }

        $office->update($data);

        return response()->json($office);
    }

    public function destroy(int $id): JsonResponse
    {
        $office = Office::findOrFail($id);
        $office->delete();

        return response()->json(['message' => 'Office deleted successfully']);
    }
}
