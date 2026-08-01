<?php

namespace App\Http\Controllers;

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

        return response()->json(
            BookingRequirement::orderBy('sort_order')->orderBy('id')->get()
        );
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

        return response()->json($query->get());
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
     * Helper to populate default initial requirements if database is empty
     */
    private function ensureDefaultRequirements(): void
    {
        if (BookingRequirement::count() === 0) {
            $officeId = Office::first()?->id;

            BookingRequirement::create([
                'office_id'      => $officeId,
                'classification' => 'Organization Purposes',
                'label'          => 'Formal request letter signed and endorsed by the Dean of Student Affairs (DSA)',
                'description'    => 'Mandatory endorsement for all student organization venue activities.',
                'sort_order'     => 1,
            ]);

            BookingRequirement::create([
                'office_id'      => $officeId,
                'classification' => 'Academic Purposes',
                'label'          => 'Formal request letter signed and endorsed by the VP for Academic Affairs (VP Acad)',
                'description'    => 'Mandatory endorsement for academic events and examinations.',
                'sort_order'     => 2,
            ]);
        }
    }
}
