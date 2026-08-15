<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\BookingRequirement;
use App\Models\Office;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingRequirementController extends Controller
{
    /**
     * Public endpoint for landing page & public venue booking
     */
    public function publicIndex(): JsonResponse
    {
        $this->ensureDefaultRequirements();

        $reqs = BookingRequirement::orderBy('sort_order')->orderBy('id')->get();
        $unique = $reqs->unique(function ($item) {
            return strtolower(trim($item->label));
        })->values();

        return response()->json($unique);
    }

    /**
     * Admin index
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureDefaultRequirements();

        $user = $request->user();
        $query = BookingRequirement::orderBy('sort_order')->orderBy('id');

        if ($user && !$user->isSuperAdmin() && $user->office_id) {
            $query->where(function ($q) use ($user) {
                $q->where('office_id', $user->office_id)->orWhereNull('office_id');
            });
        }

        $all = $query->get()->unique(function ($item) {
            return strtolower(trim($item->label));
        })->values();

        return response()->json($all);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'office_id'      => 'nullable|exists:offices,id',
            'classification' => 'required|string|max:50',
            'label'          => 'required|string|max:255',
            'description'    => 'nullable|string|max:500',
            'sort_order'     => 'nullable|integer|min:0',
        ]);

        if (empty($data['office_id'])) {
            $data['office_id'] = Office::first()?->id;
        }

        $req = BookingRequirement::create($data);

        return response()->json($req, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $req = BookingRequirement::findOrFail($id);

        $data = $request->validate([
            'classification' => 'sometimes|string|max:50',
            'label'          => 'sometimes|string|max:255',
            'description'    => 'nullable|string|max:500',
            'sort_order'     => 'nullable|integer|min:0',
        ]);

        $req->update($data);

        return response()->json($req);
    }

    public function destroy(int $id): JsonResponse
    {
        $req = BookingRequirement::findOrFail($id);
        $req->delete();

        return response()->json(['message' => 'Requirement archived']);
    }

    /**
     * Helper to populate default initial requirements if database is empty and purge any duplicates
     */
    private function ensureDefaultRequirements(): void
    {
        try {
            $office = Office::first();
            if (!$office) {
                $office = Office::create([
                    'name'     => 'General Administration',
                    'slug'     => 'general-administration',
                    'location' => 'Main Building',
                ]);
            }

            BookingRequirement::firstOrCreate(
                ['label' => 'Formal request letter signed and endorsed by the Dean of Student Affairs (DSA)'],
                [
                    'office_id'      => $office->id,
                    'classification' => 'Organization Purposes',
                    'description'    => 'Mandatory endorsement for all student organization venue activities.',
                    'sort_order'     => 1,
                ]
            );

            BookingRequirement::firstOrCreate(
                ['label' => 'Formal request letter signed and endorsed by the VP for Academic Affairs (VP Acad)'],
                [
                    'office_id'      => $office->id,
                    'classification' => 'Academic Purposes',
                    'description'    => 'Mandatory endorsement for academic events and examinations.',
                    'sort_order'     => 2,
                ]
            );

            // Clean up any duplicate records with identical labels
            $all = BookingRequirement::orderBy('id')->get();
            $seen = [];
            foreach ($all as $item) {
                $key = strtolower(trim($item->label));
                if (isset($seen[$key])) {
                    $item->delete();
                } else {
                    $seen[$key] = true;
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ensureDefaultRequirements failed: ' . $e->getMessage());
        }
    }
}
