<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\BookingRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingRequirementController extends Controller
{
    /**
     * Public endpoint for landing page & public venue booking
     */
    public function publicIndex(): JsonResponse
    {
        try {
            $reqs = BookingRequirement::orderBy('sort_order')->orderBy('id')->get();
            $unique = $reqs->unique(function ($item) {
                return strtolower(trim($item->label));
            })->values();

            return response()->json($unique);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('publicIndex booking-requirements failed: ' . $e->getMessage());
            return response()->json([]);
        }
    }

    /**
     * Admin index
     */
    public function index(Request $request): JsonResponse
    {
        $query = BookingRequirement::orderBy('sort_order')->orderBy('id');

        $all = $query->get()->unique(function ($item) {
            return strtolower(trim($item->label));
        })->values();

        return response()->json($all);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'classification'        => 'nullable|string|max:100',
            'label'                 => 'required|string|max:255',
            'description'           => 'nullable|string|max:10000',
            'sort_order'            => 'nullable|integer|min:0',
            'template_file'         => 'nullable|file|max:25600',
            'template_file_url'     => 'nullable|string',
            'template_file_name'    => 'nullable|string|max:255',
            'template_display_mode' => 'nullable|string',
            'format_content'        => 'nullable',
        ]);

        $data['classification'] = !empty($data['classification']) ? $data['classification'] : 'all';

        if (empty($data['template_display_mode']) || !in_array($data['template_display_mode'], ['uploaded_file', 'digital_format', 'both'])) {
            $data['template_display_mode'] = 'uploaded_file';
        }

        if ($request->hasFile('template_file')) {
            $file = $request->file('template_file');
            $data['template_file_url'] = app(\App\Services\MediaUploadService::class)->upload($file, 'requirements');
            $data['template_file_name'] = $file->getClientOriginalName();
        }

        if ($request->has('format_content')) {
            $val = $request->input('format_content');
            if (is_string($val)) {
                $decoded = json_decode($val, true);
                $data['format_content'] = json_last_error() === JSON_ERROR_NONE ? $decoded : $val;
            } else {
                $data['format_content'] = $val;
            }
        }

        $req = BookingRequirement::create($data);

        return response()->json($req, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $req = BookingRequirement::findOrFail($id);

        $data = $request->validate([
            'classification'        => 'sometimes|nullable|string|max:100',
            'label'                 => 'sometimes|required|string|max:255',
            'description'           => 'nullable|string|max:10000',
            'sort_order'            => 'nullable|integer|min:0',
            'template_file'         => 'nullable|file|max:25600',
            'template_file_url'     => 'nullable|string',
            'template_file_name'    => 'nullable|string|max:255',
            'template_display_mode' => 'nullable|string',
            'remove_template'       => 'nullable',
            'format_content'        => 'nullable',
        ]);

        if (isset($data['classification']) && empty($data['classification'])) {
            $data['classification'] = 'all';
        }

        if (isset($data['template_display_mode'])) {
            if (empty($data['template_display_mode']) || !in_array($data['template_display_mode'], ['uploaded_file', 'digital_format', 'both'])) {
                $data['template_display_mode'] = 'uploaded_file';
            }
        }

        if ($request->boolean('remove_template')) {
            $data['template_file_url'] = null;
            $data['template_file_name'] = null;
        } elseif ($request->hasFile('template_file')) {
            $file = $request->file('template_file');
            $data['template_file_url'] = app(\App\Services\MediaUploadService::class)->upload($file, 'requirements');
            $data['template_file_name'] = $file->getClientOriginalName();
        }

        if ($request->has('format_content')) {
            $val = $request->input('format_content');
            if (is_string($val)) {
                $decoded = json_decode($val, true);
                $data['format_content'] = json_last_error() === JSON_ERROR_NONE ? $decoded : $val;
            } else {
                $data['format_content'] = $val;
            }
        }

        unset($data['remove_template']);

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
            // Rename any legacy records in the database
            BookingRequirement::where('label', 'like', '%Dean of Student Affairs%')
                ->orWhere('label', 'like', '%(DSA)%')
                ->update(['label' => 'Formal request letter signed and endorsed by the Director of OISAA']);

            // Strip any "Format: " prefix from requirement labels
            BookingRequirement::where('label', 'like', 'Format: %')->get()->each(function ($req) {
                $req->update(['label' => preg_replace('/^Format:\s*/i', '', $req->label)]);
            });

            BookingRequirement::where('label', 'like', '%VP for Academic Affairs%')
                ->orWhere('label', 'like', '%(VP Acad)%')
                ->update(['label' => 'Formal request letter signed and endorsed by the OVPASA']);

            // No auto-seeding of hardcoded requirements; let administrators create and upload templates
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
